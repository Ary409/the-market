import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal, Pressable,
  Animated, Easing,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Keyboard } from 'react-native';
import { colors } from '../../components/theme';
import Icon from '../../components/Icon';
import BarcodeScanner from '../../components/BarcodeScanner';
import * as API from '../../api';
import * as DB  from '../../storage/db';
import * as Offline from '../../storage/offline';

function fmt(n) {
  return 'L ' + Number(n || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function POSScreen({ user, onLogout, isOnline = true, pendingCount = 0, onSaleQueued }) {
  const [query,       setQuery]       = useState('');
  const [resultados,  setResultados]  = useState([]);
  const [buscando,    setBuscando]    = useState(false);
  const [cart,        setCart]        = useState([]);
  const [metodo,      setMetodo]      = useState('efectivo');
  const [recibido,    setRecibido]    = useState('');
  const [procesando,  setProcesando]  = useState(false);
  const [recibo,      setRecibo]      = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error,       setError]       = useState('');
  const [cajaError,   setCajaError]   = useState(false);
  const [cliente,     setCliente]     = useState(null);   // cliente para fiado
  const [pickerOpen,  setPickerOpen]  = useState(false);
  const [caja,        setCaja]        = useState(null);
  const [cajaModal,   setCajaModal]   = useState(null);   // 'abrir' | 'cerrar' | null
  const [cajaMonto,   setCajaMonto]   = useState('');
  const [cajaBusy,    setCajaBusy]    = useState(false);
  const [cierreInfo,  setCierreInfo]  = useState(null);   // resumen tras cerrar turno

  // El estado del turno sale de la capa offline: sirve con y sin conexión
  function refreshCaja() {
    Offline.getCaja(isOnline)
      .then(c  => { setCaja(c); setCajaError(!c); })
      .catch(() => setCajaError(false));
  }
  React.useEffect(refreshCaja, [isOnline]);

  // ── Abrir / cerrar turno de caja (funciona sin conexión) ──────────────────
  async function accionCaja() {
    const m = parseFloat(cajaMonto);
    if (isNaN(m) || m < 0) return;
    setCajaBusy(true);
    try {
      if (cajaModal === 'abrir') {
        const r = await Offline.abrirCaja(m, isOnline);
        setCajaModal(null);
        if (r.enCola) setError('Turno abierto en el teléfono; se registrará al reconectar.');
      } else {
        const r = await Offline.cerrarCaja(m, isOnline);
        setCajaModal(null);
        setCierreInfo({ ...r.resultado, enCola: r.enCola });
      }
      setCajaMonto('');
      if (onSaleQueued) onSaleQueued();
      refreshCaja();
    } catch (e) {
      alert(e.message || 'Error de caja');
    } finally {
      setCajaBusy(false);
    }
  }

  // ── Búsqueda (online → API, offline → cache local) ───────────────────────

  async function buscar(q) {
    const texto = (q ?? query).trim();
    if (!texto) { setResultados([]); return; }
    setBuscando(true);
    setError('');

    try {
      if (isOnline) {
        // ── Modo online ──────────────────────────────────────
        try {
          const p = await API.getProductoByBarcode(texto);
          agregarAlCarrito(p);
          setQuery(''); setResultados([]);
          return;
        } catch {}
        const res = await API.getProductos({ q: texto, per_page: 8 });
        setResultados(res.items || []);
      } else {
        // ── Modo offline ─────────────────────────────────────
        // Barcode: dígitos puros y longitud >= 6
        const esBarcode = /^\d{6,}$/.test(texto);
        if (esBarcode) {
          const p = await DB.getCachedProductByBarcode(texto);
          if (p) { agregarAlCarrito(normalizeLocal(p)); setQuery(''); setResultados([]); return; }
        }
        const res = await DB.searchCachedProducts(texto);
        setResultados(res.map(normalizeLocal));
      }
    } catch (e) {
      setError(e.message || 'Error al buscar');
    } finally {
      setBuscando(false);
    }
  }

  // Normalizar producto local (SQLite) al mismo shape que la API
  function normalizeLocal(p) {
    return {
      id:          p.id,
      nombre:      p.nombre,
      precio_venta: p.precio_venta,
      stock:       p.stock,
      codigo:      p.codigo || '',
    };
  }

  function agregarAlCarrito(producto) {
    setCart(prev => {
      const ex = prev.find(i => i.producto.id === producto.id);
      if (ex) return prev.map(i =>
        i.producto.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
      );
      return [...prev, { producto, cantidad: 1 }];
    });
    setResultados([]);
    setQuery('');
  }

  function cambiarCantidad(id, delta) {
    setCart(prev => prev.map(i =>
      i.producto.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i
    ));
  }

  function quitarDelCarrito(id) {
    setCart(prev => prev.filter(i => i.producto.id !== id));
  }

  const total  = cart.reduce((s, i) => s + i.producto.precio_venta * i.cantidad, 0);
  const cambio = metodo === 'efectivo' && recibido && parseFloat(recibido) >= total
    ? parseFloat(recibido) - total : null;

  // ── Cobrar ────────────────────────────────────────────────────────────────

  async function cobrar() {
    if (!cart.length) return;
    setError('');
    if (metodo === 'efectivo' && (!recibido || parseFloat(recibido) < total)) {
      setError('El monto recibido es insuficiente'); return;
    }
    if (metodo === 'credito' && !cliente) {
      setError('Selecciona el cliente para anotarle el fiado'); return;
    }
    setProcesando(true);

    const montoRecibido = metodo === 'efectivo' ? parseFloat(recibido) : total;

    try {
      if (isOnline) {
        // ── Venta online normal (el precio real lo fija el servidor) ─────────
        const payload = {
          items: cart.map(i => ({
            producto_id: i.producto.id,
            cantidad:    i.cantidad,
          })),
          metodo_pago: metodo,
        };
        if (metodo !== 'credito') payload.monto_recibido = montoRecibido;
        if (cliente) payload.cliente_id = cliente.id;

        const venta = await API.crearVenta(payload);
        const r = await API.getRecibo(venta.id);
        setRecibo(r);
        setCliente(null);
      } else {
        // ── Venta offline: guardar en cola local ──────────────
        const saleData = {
          metodo_pago:    metodo,
          monto_recibido: metodo === 'credito' ? 0 : montoRecibido,
          total,
          cliente_id:     cliente ? cliente.id : null,
          cliente_nombre: cliente ? cliente.nombre : '',
          items: cart.map(i => ({
            producto_id:     i.producto.id,
            nombre:          i.producto.nombre,
            cantidad:        i.cantidad,
            precio_unitario: i.producto.precio_venta,
          })),
        };
        await DB.queueSale(saleData);

        // Actualizar stock en caché local
        for (const i of cart) {
          await DB.updateCachedStock(i.producto.id, -i.cantidad);
        }

        // Notificar al padre para actualizar el contador de pendientes
        if (onSaleQueued) onSaleQueued();

        // Recibo local
        setRecibo({
          offline:        true,
          numero_recibo:  'PENDIENTE',
          items:          cart.map(i => ({
            nombre:   i.producto.nombre,
            cantidad: i.cantidad,
            subtotal: i.producto.precio_venta * i.cantidad,
          })),
          total,
          metodo_pago:    metodo,
          cliente:        cliente ? cliente.nombre : null,
          monto_recibido: metodo === 'credito' ? null : montoRecibido,
          cambio:         metodo === 'efectivo' ? montoRecibido - total : 0,
        });
        setCliente(null);
      }

      setCart([]);
      setRecibido('');
      setQuery('');
    } catch (e) {
      setError(e.message || 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  }

  // ── Vista de recibo ───────────────────────────────────────────────────────

  if (recibo) {
    const esOffline = recibo.offline === true;
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.reciboContainer} showsVerticalScrollIndicator={false}>

          <View style={s.reciboSuccess}>
            <SelloExito offline={esOffline} />
            <Text style={s.reciboTitle}>
              {esOffline ? 'Venta guardada' : 'Venta registrada'}
            </Text>
            {esOffline ? (
              <View style={s.offlineBadge}>
                <Icon name="wifi-off" size={12} color="#B45309" />
                <Text style={s.offlineBadgeText}>Se sincronizará al reconectar</Text>
              </View>
            ) : (
              <Text style={s.reciboNumero}>{recibo.numero_recibo}</Text>
            )}
          </View>

          <View style={s.reciboCard}>
            {recibo.items?.map((item, i) => (
              <View key={i} style={[s.reciboItem, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <Text style={s.reciboItemNombre} numberOfLines={1}>{item.nombre}</Text>
                <Text style={s.reciboItemQty}>×{item.cantidad}</Text>
                <Text style={s.reciboItemSub}>{fmt(item.subtotal)}</Text>
              </View>
            ))}
            <View style={[s.reciboItem, s.reciboTotal]}>
              <Text style={s.reciboTotalLabel}>Total</Text>
              <Text style={s.reciboTotalValue}>{fmt(recibo.total)}</Text>
            </View>
            {recibo.metodo_pago === 'efectivo' && recibo.monto_recibido != null && (
              <View style={s.reciboItem}>
                <Text style={{ fontSize: 13, color: colors.fgMuted }}>Recibido</Text>
                <Text style={{ fontSize: 13, color: colors.fgMuted }}>{fmt(recibo.monto_recibido)}</Text>
              </View>
            )}
            {(recibo.metodo_pago === 'credito' || recibo.es_credito) && (
              <View style={s.reciboItem}>
                <Text style={{ fontSize: 13, color: '#B45309', fontWeight: '600' }}>Fiado a</Text>
                <Text style={{ fontSize: 13, color: '#B45309', fontWeight: '600' }}>{recibo.cliente || '—'}</Text>
              </View>
            )}
            {recibo.cambio > 0 && (
              <View style={[s.reciboItem, s.reciboCambio]}>
                <Text style={s.reciboCambioLabel}>Cambio</Text>
                <Text style={s.reciboCambioValue}>{fmt(recibo.cambio)}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={s.btnNuevaVenta}
            onPress={() => {
              setRecibo(null);
              if (isOnline) {
                API.getCajaActual().then(c => setCajaError(!c)).catch(() => {});
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={s.btnNuevaVentaText}>Nueva venta</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── POS principal ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerBrand}>
          <View style={s.brandDot} />
          <Text style={s.brandName}>the market</Text>
          <View style={s.posBadge}><Text style={s.posBadgeText}>POS</Text></View>
        </View>
        <View style={s.headerRight}>
          {pendingCount > 0 && (
            <View style={s.pendingPill}>
              <Icon name="clock" size={11} color="#B45309" />
              <Text style={s.pendingPillText}>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {isOnline && !cajaError && (
            <TouchableOpacity onPress={() => { setCajaMonto(''); setCajaModal('cerrar'); }} style={s.cajaHeaderBtn} activeOpacity={0.7}>
              <Icon name="wallet" size={13} color={colors.fgMuted} />
              <Text style={s.cajaHeaderBtnText}>Cerrar turno</Text>
            </TouchableOpacity>
          )}
          <Text style={s.headerUser}>{user?.nombre}</Text>
          <TouchableOpacity onPress={onLogout} style={s.logoutBtn} activeOpacity={0.7}>
            <Icon name="log-out" size={16} color={colors.fgMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* El estado de conexión y la sincronización los muestra la barra global
          (components/EstadoConexion) para no repetir el mismo aviso dos veces */}

      {cajaError && isOnline && (
        <View style={s.cajaWarning}>
          <Icon name="alert-triangle" size={14} color="#B45309" />
          <Text style={s.cajaWarningText}>Caja cerrada</Text>
          <TouchableOpacity style={s.cajaAbrirBtn} activeOpacity={0.8}
            onPress={() => { setCajaMonto(''); setCajaModal('abrir'); }}>
            <Text style={s.cajaAbrirBtnText}>Abrir caja</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Búsqueda */}
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Icon name="search" size={17} color={colors.fgMuted} />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={t => { setQuery(t); if (!t) setResultados([]); }}
              placeholder={isOnline ? 'Nombre del producto...' : 'Buscar en catálogo local...'}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => buscar()}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResultados([]); }}>
                <Icon name="x" size={15} color={colors.fgMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.searchBtn, (!query.trim() || buscando) && s.searchBtnMuted]}
            onPress={() => buscar()}
            disabled={!query.trim() || buscando}
            activeOpacity={0.8}
          >
            {buscando
              ? <ActivityIndicator color="#fff" size="small" />
              : <Icon name="search" size={17} color="#fff" />}
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={() => setScannerOpen(true)} activeOpacity={0.8}>
            <Icon name="scan-barcode" size={20} color={colors.ink100} />
          </TouchableOpacity>
        </View>

        {/* Resultados */}
        {resultados.length > 0 && (
          <View style={s.resultados}>
            {resultados.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.resultItem, p.stock === 0 && { opacity: 0.45 }]}
                onPress={() => p.stock > 0 && agregarAlCarrito(p)}
                disabled={p.stock === 0}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.resultNombre} numberOfLines={1}>{p.nombre}</Text>
                  <Text style={s.resultStock}>{p.stock === 0 ? 'Agotado' : `Stock: ${p.stock}`}</Text>
                </View>
                <Text style={s.resultPrecio}>{fmt(p.precio_venta)}</Text>
                {p.stock > 0 && (
                  <View style={s.resultAdd}>
                    <Icon name="plus" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error ? (
          <View style={s.errorBox}>
            <Icon name="alert-triangle" size={15} color={colors.danger} />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Carrito vacío */}
        {cart.length === 0 && !resultados.length ? (
          <View style={s.emptyCart}>
            <Icon name="shopping-cart" size={36} color={colors.fgMuted} style={{ opacity: 0.35 }} />
            <Text style={s.emptyCartText}>Carrito vacío</Text>
            <Text style={s.emptyCartSub}>
              {isOnline
                ? 'Busca un producto o escanea su código'
                : 'Busca en catálogo local o escanea el código'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={i => String(i.producto.id)}
            style={s.cartList}
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item, index }) => (
              <View style={[s.cartItem, index === 0 && { borderTopWidth: 0 }]}>
                <View style={s.cartItemInfo}>
                  <Text style={s.cartNombre} numberOfLines={2}>{item.producto.nombre}</Text>
                  <Text style={s.cartPrecioUnit}>{fmt(item.producto.precio_venta)} c/u</Text>
                </View>
                <View style={s.cartControls}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => cambiarCantidad(item.producto.id, -1)} activeOpacity={0.7}>
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyCant}>{item.cantidad}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => cambiarCantidad(item.producto.id, 1)} activeOpacity={0.7}>
                    <Text style={s.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={s.cartSubtotal}>{fmt(item.producto.precio_venta * item.cantidad)}</Text>
                  <TouchableOpacity onPress={() => quitarDelCarrito(item.producto.id)} style={s.removeBtn} activeOpacity={0.7}>
                    <Icon name="x" size={14} color={colors.fgMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {/* Footer de pago */}
        {cart.length > 0 && (
          <View style={s.footer}>
            <View style={s.footerTotal}>
              <Text style={s.footerTotalLabel}>Total</Text>
              <Text style={s.footerTotalValue}>{fmt(total)}</Text>
            </View>

            <View style={s.metodosRow}>
              {[
                { id: 'efectivo', label: 'Efectivo' },
                { id: 'tarjeta',  label: 'Tarjeta' },
                { id: 'credito',  label: 'Fiado' },
              ].map(m => (
                <TouchableOpacity
                  key={m.id}
                  style={[s.metodoBtn, metodo === m.id && s.metodoBtnActive]}
                  onPress={() => { setMetodo(m.id); setError(''); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.metodoBtnText, metodo === m.id && s.metodoBtnTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {metodo === 'credito' && (
              <TouchableOpacity style={s.clienteBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
                <Icon name="users" size={15} color={cliente ? colors.ink100 : colors.fgMuted} />
                {cliente ? (
                  <View style={{ flex: 1 }}>
                    <Text style={s.clienteNombre} numberOfLines={1}>{cliente.nombre}</Text>
                    {cliente.saldo > 0 && <Text style={s.clienteDeuda}>Ya debe {fmt(cliente.saldo)}</Text>}
                  </View>
                ) : (
                  <Text style={s.clientePlaceholder}>Elegir cliente para el fiado…</Text>
                )}
                {cliente && (
                  <TouchableOpacity onPress={() => setCliente(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="x" size={15} color={colors.fgMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}

            {metodo === 'efectivo' && (
              <View style={s.efectivoRow}>
                <View style={s.efectivoInput}>
                  <Text style={s.efectivoPrefijo}>$</Text>
                  <TextInput
                    style={s.efectivoField}
                    value={recibido}
                    onChangeText={t => { setRecibido(t); setError(''); }}
                    placeholder="Monto recibido"
                    keyboardType="decimal-pad"
                    placeholderTextColor={colors.fgMuted}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickScroll}>
                  {[50, 100, 200, 500].map(amt => (
                    <TouchableOpacity key={amt} style={s.quickBtn} onPress={() => setRecibido(String(amt))} activeOpacity={0.7}>
                      <Text style={s.quickBtnText}>${amt}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={s.quickBtn} onPress={() => setRecibido(total.toFixed(2))} activeOpacity={0.7}>
                    <Text style={s.quickBtnText}>Exacto</Text>
                  </TouchableOpacity>
                </ScrollView>
                {cambio !== null && (
                  <View style={s.cambioRow}>
                    <Text style={s.cambioLabel}>Cambio</Text>
                    <Text style={s.cambioValue}>{fmt(cambio)}</Text>
                  </View>
                )}
              </View>
            )}

            {error ? (
              <View style={s.footerError}>
                <Text style={s.footerErrorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.cobrarBtn, (cart.length === 0 || procesando || (cajaError && isOnline)) && s.cobrarBtnDisabled,
                !isOnline && s.cobrarBtnOffline]}
              onPress={cobrar}
              disabled={cart.length === 0 || procesando || (cajaError && isOnline)}
              activeOpacity={0.85}
            >
              {procesando
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.cobrarBtnText}>
                    {metodo === 'credito'
                      ? `Fiar ${fmt(total)}`
                      : isOnline ? `Cobrar ${fmt(total)}` : `Guardar venta ${fmt(total)}`}
                  </Text>}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <BarcodeScanner
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={codigo => {
          setScannerOpen(false);
          setQuery(codigo);
          buscar(codigo);
        }}
      />

      <ClientePicker
        visible={pickerOpen}
        isOnline={isOnline}
        onClose={() => setPickerOpen(false)}
        onSelect={c => { setCliente(c); setPickerOpen(false); setError(''); }}
      />

      {/* Abrir / cerrar turno de caja — el teclado numérico no tiene tecla de
          retorno, así que la tarjeta sube con el teclado y los botones quedan
          siempre visibles; tocar fuera cierra el teclado. */}
      <Modal visible={cajaModal !== null} transparent animationType="fade" onRequestClose={() => setCajaModal(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={s.cajaOverlay} onPress={() => Keyboard.dismiss()}>
            <Pressable style={s.cajaCard} onPress={() => {}}>
              <Text style={s.cajaTitle}>{cajaModal === 'abrir' ? 'Abrir caja' : 'Cerrar turno'}</Text>
              <Text style={s.cajaSub}>
                {cajaModal === 'abrir'
                  ? 'Efectivo inicial con el que arranca la caja'
                  : 'Cuenta el efectivo físico y escribe el total'}
              </Text>
              <View style={s.cajaInputRow}>
                <Text style={s.cajaPrefijo}>$</Text>
                <TextInput
                  style={s.cajaInput}
                  value={cajaMonto}
                  onChangeText={setCajaMonto}
                  placeholder={cajaModal === 'abrir' ? 'Monto inicial' : 'Efectivo contado'}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.fgMuted}
                  autoFocus
                />
                {!!cajaMonto && (
                  <TouchableOpacity onPress={() => setCajaMonto('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="x" size={16} color={colors.fgMuted} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.cajaBtnRow}>
                <TouchableOpacity style={s.cajaBtnSec} activeOpacity={0.7}
                  onPress={() => { Keyboard.dismiss(); setCajaModal(null); }} disabled={cajaBusy}>
                  <Text style={s.cajaBtnSecText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.cajaBtnPri, !cajaMonto && { opacity: 0.45 }]} activeOpacity={0.85}
                  onPress={accionCaja} disabled={cajaBusy || !cajaMonto}>
                  {cajaBusy
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.cajaBtnPriText}>{cajaModal === 'abrir' ? 'Abrir' : 'Hacer corte'}</Text>}
                </TouchableOpacity>
              </View>
              <Text style={s.cajaPista}>Desliza hacia abajo o toca fuera para cerrar el teclado</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Resumen del corte de caja.
          El detalle va dentro de un ScrollView y el botón queda FIJO abajo:
          antes el contenido desbordaba la tarjeta y recortaba el botón, de modo
          que no había forma de salir salvo cerrando la app. */}
      <Modal visible={!!cierreInfo} transparent animationType="fade" onRequestClose={() => setCierreInfo(null)}>
        <View style={s.cajaOverlay}>
          <View style={[s.cajaCard, { maxHeight: '82%' }]}>
            <Text style={s.cajaTitle}>Turno cerrado</Text>
            <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
              {cierreInfo && (() => {
                const r = cierreInfo.resumen;
                const filas = [
                  ['Total vendido', fmt(r.total_ventas), null],
                  ['Efectivo', fmt(r.ventas_efectivo), null],
                  ['Tarjeta', fmt(r.ventas_tarjeta), null],
                  ['Fiado (no entra a caja)', fmt(r.ventas_credito || 0), '#B45309'],
                  ['Cuentas cobradas', fmt((r.cobros_credito_efectivo || 0) + (r.cobros_credito_tarjeta || 0)), '#15803D'],
                  ['Esperado', fmt(r.monto_esperado), null],
                  ['Contado', fmt(cierreInfo.sesion.monto_contado), null],
                  ['Diferencia', (r.diferencia >= 0 ? '+' : '') + fmt(r.diferencia),
                    r.diferencia === 0 ? null : r.diferencia > 0 ? '#15803D' : colors.danger],
                ];
                return filas.map(([k, v, color]) => (
                  <View key={k} style={s.cierreRow}>
                    <Text style={s.cierreLabel}>{k}</Text>
                    <Text style={[s.cierreValor, color && { color }]}>{v}</Text>
                  </View>
                ));
              })()}
            </ScrollView>
            <TouchableOpacity style={[s.cajaBtnPri, { marginTop: 14 }]} activeOpacity={0.85}
              onPress={() => setCierreInfo(null)}>
              <Text style={s.cajaBtnPriText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sello animado de venta completada ────────────────────────────────────────
// Es el momento que el vendedor repite decenas de veces al día: un pequeño
// rebote confirma de un vistazo que la venta quedó, sin tener que leer.

function SelloExito({ offline }) {
  const escala = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(escala, { toValue: 1.15, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(escala, { toValue: 1, useNativeDriver: true, friction: 4, tension: 90 }),
    ]).start();
  }, [escala]);

  return (
    <Animated.View style={[s.reciboCheck, offline && s.reciboCheckOffline, { transform: [{ scale: escala }] }]}>
      <Icon name={offline ? 'clock' : 'check'} size={28} color={offline ? '#B45309' : '#15803D'} />
    </Animated.View>
  );
}

// ── Selector de cliente para fiado ───────────────────────────────────────────

function ClientePicker({ visible, isOnline = true, onClose, onSelect }) {
  const [query,      setQuery]      = useState('');
  const [resultados, setResultados] = useState([]);
  const [cargando,   setCargando]   = useState(false);
  const [creando,    setCreando]    = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    const t = setTimeout(async () => {
      setCargando(true);
      try {
        // La capa offline decide: servidor si hay red, copia local si no,
        // con los saldos ajustados por lo que aún está en cola.
        setResultados(await Offline.getClientes({ search: query, isOnline }));
      } catch { setResultados([]); }
      finally { setCargando(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query, visible, isOnline]);

  async function crearRapido() {
    if (!query.trim() || creando) return;
    setCreando(true);
    try {
      // Sin conexión el cliente queda en cola y se le puede fiar de una vez
      const { cliente } = await Offline.crearCliente({ nombre: query.trim() }, isOnline);
      onSelect(cliente);
      setQuery('');
    } catch (e) { alert(e.message); }
    finally { setCreando(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* SafeAreaProvider propio: dentro de un Modal no se heredan los márgenes
          del teléfono y el título quedaba debajo de la hora */}
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.ink05 }} edges={['top', 'bottom']}>
          <View style={s.pickerHeader}>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={s.pickerBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
              <Icon name="chevron-left" size={22} color={colors.ink100} />
            </TouchableOpacity>
            <Text style={s.pickerTitle}>Cliente para el fiado</Text>
            <TouchableOpacity onPress={() => { Keyboard.dismiss(); onClose(); }}
              style={s.pickerBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.6}>
              <Icon name="x" size={20} color={colors.fgMuted} />
            </TouchableOpacity>
          </View>
          <View style={s.pickerSearch}>
            <Icon name="search" size={15} color={colors.fgMuted} />
            <TextInput
              style={s.pickerInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar o escribir nombre nuevo…"
              placeholderTextColor={colors.fgMuted}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoFocus
            />
            {cargando && <ActivityIndicator size="small" />}
          </View>
          <FlatList
            data={resultados}
            keyExtractor={c => String(c.id)}
            contentContainerStyle={{ padding: 16, paddingTop: 4 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => (
              <TouchableOpacity style={s.pickerRow} onPress={() => onSelect(item)} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={s.pickerNombre}>{item.nombre}</Text>
                  {item.telefono ? <Text style={s.pickerTel}>{item.telefono}</Text> : null}
                </View>
                {item.saldo > 0 && <Text style={s.pickerSaldo}>Debe {fmt(item.saldo)}</Text>}
                <Icon name="chevron-right" size={16} color={colors.fgMuted} />
              </TouchableOpacity>
            )}
            ListFooterComponent={query.trim() ? (
              <TouchableOpacity style={s.pickerCrear} onPress={crearRapido} disabled={creando} activeOpacity={0.7}>
                {creando
                  ? <ActivityIndicator size="small" />
                  : <Text style={s.pickerCrearText}>+ Crear cliente "{query.trim()}"</Text>}
              </TouchableOpacity>
            ) : null}
            ListEmptyComponent={!query.trim() ? (
              <Text style={s.pickerVacio}>Escribe para buscar un cliente o crear uno nuevo.</Text>
            ) : null}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink05 },

  // Caja (abrir/cerrar turno)
  cajaHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  cajaHeaderBtnText: { fontSize: 11, fontWeight: '600', color: colors.fgMuted },
  cajaAbrirBtn: {
    marginLeft: 'auto', backgroundColor: colors.ink100,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  cajaAbrirBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cajaOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  cajaCard: {
    width: '100%', maxWidth: 380, backgroundColor: colors.paper,
    borderRadius: 16, padding: 20,
  },
  cajaTitle: { fontSize: 17, fontWeight: '700', color: colors.ink100 },
  cajaSub:   { fontSize: 13, color: colors.fgMuted, marginTop: 2, marginBottom: 14 },
  cajaInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    paddingHorizontal: 14,
  },
  cajaPrefijo: { fontSize: 16, color: colors.fgMuted },
  cajaInput:   { flex: 1, height: 48, fontSize: 18, fontWeight: '600', color: colors.ink100 },
  cajaBtnRow:  { flexDirection: 'row', gap: 10, marginTop: 16 },
  cajaBtnSec: {
    flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  cajaBtnSecText: { fontSize: 14, fontWeight: '600', color: colors.fgMuted },
  cajaBtnPri: {
    flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.ink100,
    alignItems: 'center', justifyContent: 'center',
  },
  cajaBtnPriText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  cajaPista: { fontSize: 11, color: colors.fgSubtle, textAlign: 'center', marginTop: 12 },
  cierreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cierreLabel: { fontSize: 13, color: colors.fgMuted },
  cierreValor: { fontSize: 13, fontWeight: '700', color: colors.ink100 },

  // Cliente / fiado
  clienteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  clienteNombre:      { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  clienteDeuda:       { fontSize: 11, color: '#B45309', marginTop: 1 },
  clientePlaceholder: { fontSize: 13, color: colors.fgMuted, flex: 1 },

  // Picker de cliente
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  pickerBack:   { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  pickerTitle:  { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink100 },
  pickerSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12,
  },
  pickerInput:  { flex: 1, height: 44, fontSize: 14, color: colors.ink100 },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8,
  },
  pickerNombre: { fontSize: 14, fontWeight: '600', color: colors.ink100 },
  pickerTel:    { fontSize: 12, color: colors.fgMuted, marginTop: 1 },
  pickerSaldo:  { fontSize: 12, fontWeight: '600', color: '#B45309' },
  pickerCrear: {
    borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 10,
  },
  pickerCrearText: { fontSize: 13, fontWeight: '600', color: colors.fgMuted },
  pickerVacio:     { textAlign: 'center', color: colors.fgMuted, fontSize: 13, marginTop: 24 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 22, height: 22, borderRadius: 5, backgroundColor: colors.ink100 },
  brandName: { fontSize: 14, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  posBadge: { backgroundColor: colors.ink10, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  posBadgeText: { fontSize: 10, fontWeight: '700', color: colors.fgMuted, letterSpacing: 0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerUser: { fontSize: 12, fontWeight: '500', color: colors.fgMuted },
  logoutBtn: { padding: 6 },

  // Pill de pendientes
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  pendingPillText: { fontSize: 11, fontWeight: '600', color: '#B45309' },

  // Banners
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 14, paddingVertical: 9,
  },
  offlineBannerText: { flex: 1, fontSize: 12, fontWeight: '500', color: '#92400E' },
  syncBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  syncBannerText: { fontSize: 12, fontWeight: '500', color: '#1D4ED8' },
  cajaWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 14, paddingVertical: 8,
  },
  cajaWarningText: { fontSize: 12, fontWeight: '500', color: '#B45309', flex: 1 },

  // Búsqueda
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: colors.paper,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    height: 42, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.ink05,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.fg },
  searchBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnMuted: { opacity: 0.4 },
  scanBtn: {
    width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center',
  },

  // Resultados
  resultados: { backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  resultNombre: { fontSize: 14, fontWeight: '500', color: colors.ink100 },
  resultStock: { fontSize: 11, color: colors.fgMuted, marginTop: 1 },
  resultPrecio: { fontSize: 14, fontWeight: '700', color: colors.ink100 },
  resultAdd: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center',
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, padding: 12,
    backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerBd, borderRadius: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: colors.danger },

  // Carrito vacío
  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8 },
  emptyCartText: { fontSize: 16, fontWeight: '600', color: colors.ink100, marginTop: 8 },
  emptyCartSub: { fontSize: 13, color: colors.fgMuted, textAlign: 'center' },

  // Carrito
  cartList: { flex: 1, backgroundColor: colors.paper },
  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  cartItemInfo: { flex: 1 },
  cartNombre: { fontSize: 13, fontWeight: '500', color: colors.ink100, lineHeight: 18 },
  cartPrecioUnit: { fontSize: 11, color: colors.fgMuted, marginTop: 1 },
  cartControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 6,
    borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper,
  },
  qtyBtnText: { fontSize: 16, fontWeight: '600', color: colors.ink100, lineHeight: 20 },
  qtyCant: { minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: '700', color: colors.ink100 },
  cartSubtotal: { fontSize: 13, fontWeight: '700', color: colors.ink100, minWidth: 60, textAlign: 'right' },
  removeBtn: { padding: 4, marginLeft: 2 },

  // Footer pago
  footer: {
    backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.border,
    padding: 14, gap: 10,
  },
  footerTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTotalLabel: { fontSize: 14, fontWeight: '500', color: colors.fgMuted },
  footerTotalValue: { fontSize: 26, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  metodosRow: { flexDirection: 'row', gap: 8 },
  metodoBtn: {
    flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper,
  },
  metodoBtnActive: { backgroundColor: colors.ink100, borderColor: colors.ink100 },
  metodoBtnText: { fontSize: 13, fontWeight: '600', color: colors.ink80 },
  metodoBtnTextActive: { color: '#fff' },
  efectivoRow: { gap: 8 },
  efectivoInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 10,
    paddingHorizontal: 12, height: 44, backgroundColor: colors.paper,
  },
  efectivoPrefijo: { fontSize: 15, fontWeight: '500', color: colors.fgMuted, marginRight: 4 },
  efectivoField: { flex: 1, fontSize: 15, color: colors.fg },
  quickScroll: { flexGrow: 0 },
  quickBtn: {
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.paper,
  },
  quickBtnText: { fontSize: 12, fontWeight: '500', color: colors.fgMuted },
  cambioRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, borderRadius: 8, backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#BBF7D0',
  },
  cambioLabel: { fontSize: 13, fontWeight: '500', color: '#15803D' },
  cambioValue: { fontSize: 18, fontWeight: '700', color: '#15803D' },
  footerError: { padding: 10, backgroundColor: colors.dangerBg, borderRadius: 8 },
  footerErrorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  cobrarBtn: {
    height: 50, borderRadius: 12,
    backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center',
  },
  cobrarBtnOffline: { backgroundColor: '#D97706' },
  cobrarBtnDisabled: { opacity: 0.4 },
  cobrarBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: -0.3 },

  // Recibo
  reciboContainer: { padding: 20, alignItems: 'center', gap: 16 },
  reciboSuccess: { alignItems: 'center', gap: 6, paddingTop: 20 },
  reciboCheck: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#BBF7D0',
    alignItems: 'center', justifyContent: 'center',
  },
  reciboCheckOffline: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  reciboTitle: { fontSize: 20, fontWeight: '700', color: colors.ink100, letterSpacing: -0.5 },
  reciboNumero: { fontSize: 13, color: colors.fgMuted },
  offlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  offlineBadgeText: { fontSize: 12, fontWeight: '500', color: '#B45309' },
  reciboCard: {
    width: '100%', borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, overflow: 'hidden', backgroundColor: colors.paper,
  },
  reciboItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  reciboItemNombre: { flex: 1, fontSize: 14, color: colors.ink100 },
  reciboItemQty: { fontSize: 13, color: colors.fgMuted, marginRight: 12 },
  reciboItemSub: { fontSize: 14, fontWeight: '500', color: colors.ink100, minWidth: 70, textAlign: 'right' },
  reciboTotal: { borderTopWidth: 2, borderTopColor: colors.border },
  reciboTotalLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink100 },
  reciboTotalValue: { fontSize: 20, fontWeight: '700', color: colors.ink100 },
  reciboCambio: { backgroundColor: '#ECFDF3' },
  reciboCambioLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#15803D' },
  reciboCambioValue: { fontSize: 18, fontWeight: '700', color: '#15803D' },
  btnNuevaVenta: {
    width: '100%', height: 50, borderRadius: 12,
    backgroundColor: colors.ink100, alignItems: 'center', justifyContent: 'center',
  },
  btnNuevaVentaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

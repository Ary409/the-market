import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors } from './theme';

export default function BarcodeScanner({ visible, onScanned, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLine = useRef(new Animated.Value(0)).current;

  // Reset scanned state when modal opens
  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  // Animate the scan line
  useEffect(() => {
    if (!visible) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [visible]);

  async function handleBarcode({ data }) {
    if (scanned) return;
    setScanned(true);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    onScanned(data);
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Escanear código de barras</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
            <Icon name="x" size={22} color={colors.ink100} />
          </TouchableOpacity>
        </View>

        {/* Camera or permission prompt */}
        {!permission ? (
          <View style={s.center}>
            <Text style={s.permText}>Verificando permisos...</Text>
          </View>
        ) : !permission.granted ? (
          <View style={s.center}>
            <Icon name="scan-barcode" size={40} color={colors.fgMuted} />
            <Text style={s.permTitle}>Permiso de cámara requerido</Text>
            <Text style={s.permText}>Para escanear códigos de barras necesitamos acceso a la cámara.</Text>
            <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.8}>
              <Text style={s.permBtnText}>Conceder permiso</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarcode}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
              }}
            />

            {/* Dark overlay with cutout */}
            <View style={s.overlay}>
              <View style={s.overlayTop} />
              <View style={s.overlayMiddle}>
                <View style={s.overlaySide} />
                <View style={s.frame}>
                  {/* Corner markers */}
                  <View style={[s.corner, s.cornerTL]} />
                  <View style={[s.corner, s.cornerTR]} />
                  <View style={[s.corner, s.cornerBL]} />
                  <View style={[s.corner, s.cornerBR]} />
                  {/* Scan line */}
                  <Animated.View style={[
                    s.scanLine,
                    { transform: [{ translateY: scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 200] }) }] },
                  ]} />
                </View>
                <View style={s.overlaySide} />
              </View>
              <View style={s.overlayBottom}>
                <Text style={s.hint}>Apunta al código de barras del producto</Text>
              </View>
            </View>

            {scanned && (
              <View style={s.scannedBanner}>
                <Icon name="check" size={18} color="#fff" />
                <Text style={s.scannedText}>Código detectado</Text>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const FRAME = 240;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.ink100 },
  closeBtn: { padding: 8 },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  permTitle: { fontSize: 17, fontWeight: '600', color: colors.ink100, textAlign: 'center' },
  permText: { fontSize: 14, color: colors.fgMuted, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: colors.ink100, borderRadius: 10,
  },
  permBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cameraWrapper: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: FRAME },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20,
  },
  frame: { width: FRAME, height: FRAME, position: 'relative', overflow: 'hidden' },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: '#fff', borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute', left: 8, right: 8, height: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4,
  },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  scannedBanner: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#16A34A', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20,
  },
  scannedText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

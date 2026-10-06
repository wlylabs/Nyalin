import { Camera } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { useFilePicker } from './FilePicker';
import { supportsCameraCapture, useBrowserSupport } from '../lib/device';

/** Tombol "Ambil foto". Hanya tampil di perangkat yang bisa langsung membuka kamera. */
export function CameraButton({ children = 'Ambil foto', ...props }: Omit<ButtonProps, 'onClick' | 'icon'>) {
  const { openCamera } = useFilePicker();
  const supported = useBrowserSupport(supportsCameraCapture);
  if (!supported) return null;
  return (
    <Button icon={<Camera />} onClick={openCamera} {...props}>
      {children}
    </Button>
  );
}

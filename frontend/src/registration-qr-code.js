import QRCode from 'qrcode';
import { publicVerificationUrl } from './public-url.js';

const options = {
  errorCorrectionLevel: 'M',
  margin: 1,
  width: 360,
  color: { dark: '#0a1020', light: '#ffffff' }
};

export function generateRegistrationQrPng(ipId, encoder = QRCode) {
  return encoder.toDataURL(publicVerificationUrl(ipId), options);
}

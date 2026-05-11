import type { Metadata } from 'next';
import QuickVoiceTaskCapture from './QuickVoiceTaskCapture';

export const metadata: Metadata = {
  title: 'Captura rápida | Epixodo Lite',
};

export default function QuickAddPage() {
  return <QuickVoiceTaskCapture />;
}

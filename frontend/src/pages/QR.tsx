import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'

export default function QRPage() {
  const [qrText, setQrText] = useState('https://localhost:3001/')
  const [qrSize] = useState(250)

  const generateQR = (text: string) => {
    // Placeholder: In production, use qrcode.react or similar
    return `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(text)}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>QR Code Generator</CardTitle>
          <CardDescription>Tạo mã QR cho các liên kết</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nội dung QR Code</label>
              <textarea
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder="Nhập URL hoặc văn bản cần tạo QR code..."
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                rows={4}
              />
            </div>

            <div className="flex items-center justify-center rounded bg-gray-50 p-8">
              <div className="text-center">
                <img
                  src={generateQR(qrText)}
                  alt="QR Code"
                  className="inline-block"
                  style={{ width: qrSize, height: qrSize }}
                />
                <p className="mt-2 text-xs text-gray-500">QR Code được sinh động từ nội dung trên</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 rounded bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800">
                Tải xuống
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrText)
                }}
                className="flex-1 rounded border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
              >
                Sao chép
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mã QR gần đây</CardTitle>
          <CardDescription>Danh sách mã QR đã tạo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">Chưa có mã QR được lưu.</div>
        </CardContent>
      </Card>
    </div>
  )
}

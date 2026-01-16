import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Trang không tồn tại</h2>
        <p className="text-gray-600 mb-8">
          Xin lỗi, trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.
        </p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-gray-900 px-6 py-3 text-white font-semibold hover:bg-gray-800 transition-colors"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}

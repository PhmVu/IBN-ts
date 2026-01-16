import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'

export default function ExplorePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Khám phá</CardTitle>
          <CardDescription>Duyệt các kênh và chaincode</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-dashed p-6 text-center">
              <div className="text-4xl">📚</div>
              <h3 className="mt-2 font-semibold text-gray-800">Kênh (Channel)</h3>
              <p className="mt-1 text-sm text-gray-600">Danh sách các kênh Hyperledger Fabric</p>
              <button className="mt-3 rounded bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                Xem chi tiết
              </button>
            </div>

            <div className="rounded border border-dashed p-6 text-center">
              <div className="text-4xl">⛓️</div>
              <h3 className="mt-2 font-semibold text-gray-800">Chaincode</h3>
              <p className="mt-1 text-sm text-gray-600">Smart contracts trên blockchain</p>
              <button className="mt-3 rounded bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                Xem chi tiết
              </button>
            </div>

            <div className="rounded border border-dashed p-6 text-center">
              <div className="text-4xl">🔗</div>
              <h3 className="mt-2 font-semibold text-gray-800">Giao dịch</h3>
              <p className="mt-1 text-sm text-gray-600">Lịch sử giao dịch blockchain</p>
              <button className="mt-3 rounded bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                Xem chi tiết
              </button>
            </div>

            <div className="rounded border border-dashed p-6 text-center">
              <div className="text-4xl">📊</div>
              <h3 className="mt-2 font-semibold text-gray-800">Thống kê</h3>
              <p className="mt-1 text-sm text-gray-600">Phân tích dữ liệu hệ thống</p>
              <button className="mt-3 rounded bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                Xem chi tiết
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

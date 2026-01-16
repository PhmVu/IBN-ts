import { useState, useEffect } from 'react'
import { queryChaincode, invokeChaincode } from '../lib/chaincode'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Spinner } from '../components/Spinner'

interface TeaBatch {
  batchId: string
  origin: string
  farmName: string
  teaType: string
  harvestDate: string
  quantity: number
  unit: string
  status: string
  currentOwner: string
  createdAt: string
  events?: any[]
  certifications?: any[]
  qualityRecords?: any[]
}

export default function TeaTracePage() {
  const [tab, setTab] = useState<'batches' | 'create' | 'transfer'>('batches')
  const [batches, setBatches] = useState<TeaBatch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const channel = 'testchan'
  const chaincode = 'teatrace'

  useEffect(() => {
    if (tab === 'batches') {
      loadBatches()
    }
  }, [tab])

  const loadBatches = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await queryChaincode({
        chaincode,
        channel,
        function: 'QueryBatches',
        params: ['{}'],
      })
      if (result.success && result.data) {
        const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data
        setBatches(data.batches || [])
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setTab('batches')}
            className={`px-4 py-2 font-medium ${tab === 'batches' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Batches
          </button>
          <button
            onClick={() => setTab('create')}
            className={`px-4 py-2 font-medium ${tab === 'create' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Create Batch
          </button>
          <button
            onClick={() => setTab('transfer')}
            className={`px-4 py-2 font-medium ${tab === 'transfer' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
              }`}
          >
            Transfer Batch
          </button>
        </div>
      </div>

      {tab === 'batches' && (
        <Card>
          <CardHeader>
            <CardTitle>Tea Batches</CardTitle>
            <CardDescription>Danh sách các batch trà trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Spinner size={16} /> Đang tải...
              </div>
            ) : error ? (
              <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>
            ) : (
              <div className="overflow-hidden rounded border">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Batch ID</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Origin</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Farm</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Quantity</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {batches.map((batch) => (
                      <tr key={batch.batchId}>
                        <td className="px-4 py-2 font-medium text-gray-800">{batch.batchId}</td>
                        <td className="px-4 py-2 text-gray-600">{batch.origin}</td>
                        <td className="px-4 py-2 text-gray-600">{batch.farmName}</td>
                        <td className="px-4 py-2 text-gray-600">{batch.teaType}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {batch.quantity} {batch.unit}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{batch.currentOwner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batches.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">Chưa có batches.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'create' && <CreateBatchTab onSuccess={loadBatches} />}
      {tab === 'transfer' && <TransferBatchTab onSuccess={loadBatches} />}
    </div>
  )
}

function CreateBatchTab({ onSuccess }: { onSuccess: () => void }) {
  const [batchId, setBatchId] = useState('')
  const [origin, setOrigin] = useState('')
  const [farmName, setFarmName] = useState('')
  const [teaType, setTeaType] = useState('')
  const [harvestDate, setHarvestDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('kg')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const channel = 'testchan'
  const chaincode = 'teatrace'

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await invokeChaincode({
        chaincode,
        channel,
        function: 'CreateBatch',
        params: [batchId, origin, farmName, teaType, harvestDate, quantity, unit],
      })

      if (res.success) {
        setResult(JSON.stringify(res.data, null, 2))
        onSuccess()
        // Reset form
        setBatchId('')
        setOrigin('')
        setFarmName('')
        setTeaType('')
        setHarvestDate('')
        setQuantity('')
      } else {
        setError(res.error || 'Creation failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Create Tea Batch</CardTitle>
          <CardDescription>Tạo batch trà mới</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Batch ID *</label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="BATCH001"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Origin *</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="Lâm Đồng"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Farm Name *</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="Farm A"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tea Type *</label>
              <input
                type="text"
                value={teaType}
                onChange={(e) => setTeaType(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="Oolong"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Harvest Date *</label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Quantity *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Unit *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                >
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !batchId || !origin || !farmName || !teaType || !harvestDate || !quantity}
              className="w-full rounded bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-70"
            >
              {loading ? <Spinner size={16} /> : 'Create Batch'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả</CardTitle>
          <CardDescription>Phản hồi từ chaincode</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded bg-green-50 p-3">
              <pre className="max-h-96 overflow-auto text-xs text-gray-700">{result}</pre>
            </div>
          )}
          {!error && !result && (
            <div className="text-sm text-gray-500">Kết quả sẽ hiển thị ở đây</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function TransferBatchTab({ onSuccess }: { onSuccess: () => void }) {
  const [batchId, setBatchId] = useState('')
  const [newOwner, setNewOwner] = useState('')
  const [transferType, setTransferType] = useState('sale')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState<string>('')

  const channel = 'testchan'
  const chaincode = 'teatrace'

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await invokeChaincode({
        chaincode,
        channel,
        function: 'TransferBatch',
        params: [batchId, newOwner, transferType, notes],
      })

      if (res.success) {
        setResult(JSON.stringify(res.data, null, 2))
        onSuccess()
        setBatchId('')
        setNewOwner('')
        setNotes('')
      } else {
        setError(res.error || 'Transfer failed')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Transfer Batch</CardTitle>
          <CardDescription>Chuyển quyền sở hữu batch</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Batch ID *</label>
              <input
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="BATCH001"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">New Owner *</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                required
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                placeholder="Processor X"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Transfer Type *</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
              >
                <option value="sale">Sale</option>
                <option value="processing">Processing</option>
                <option value="distribution">Distribution</option>
                <option value="packaging">Packaging</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <button
              type="submit"
              disabled={loading || !batchId || !newOwner}
              className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {loading ? <Spinner size={16} /> : 'Transfer Batch'}
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả</CardTitle>
          <CardDescription>Phản hồi từ chaincode</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
          {result && (
            <div className="rounded bg-blue-50 p-3">
              <pre className="max-h-96 overflow-auto text-xs text-gray-700">{result}</pre>
            </div>
          )}
          {!error && !result && (
            <div className="text-sm text-gray-500">Kết quả sẽ hiển thị ở đây</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


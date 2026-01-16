import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
}

const ENTERPRISES = {
    teatrace: {
        name: 'Tea Trace',
        chaincode: 'teatrace',
        channel: 'testchan',
        icon: '🍃',
    },
}

export default function EnterpriseDetailPage() {
    const { enterpriseId } = useParams<{ enterpriseId: string }>()
    const navigate = useNavigate()
    const [tab, setTab] = useState<'products' | 'create' | 'query'>('products')
    const [batches, setBatches] = useState<TeaBatch[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const enterprise = ENTERPRISES[enterpriseId as keyof typeof ENTERPRISES]

    useEffect(() => {
        if (!enterprise) {
            navigate('/enterprises')
            return
        }
        if (tab === 'products') {
            loadBatches()
        }
    }, [tab, enterprise, navigate])

    const loadBatches = async () => {
        if (!enterprise) return

        setLoading(true)
        setError(null)
        try {
            const result = await queryChaincode({
                chaincode: enterprise.chaincode,
                channel: enterprise.channel,
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

    if (!enterprise) {
        return null
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/enterprises')}
                    className="text-gray-600 hover:text-gray-900"
                >
                    ← Quay lại
                </button>
                <span className="text-2xl">{enterprise.icon}</span>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{enterprise.name}</h1>
                    <p className="text-sm text-gray-600">
                        Chaincode: {enterprise.chaincode} | Channel: {enterprise.channel}
                    </p>
                </div>
            </div>

            <div className="border-b border-gray-200">
                <div className="flex gap-4">
                    <button
                        onClick={() => setTab('products')}
                        className={`px-4 py-2 font-medium ${tab === 'products' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
                            }`}
                    >
                        📦 Sản phẩm
                    </button>
                    <button
                        onClick={() => setTab('create')}
                        className={`px-4 py-2 font-medium ${tab === 'create' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
                            }`}
                    >
                        ➕ Tạo sản phẩm
                    </button>
                    <button
                        onClick={() => setTab('query')}
                        className={`px-4 py-2 font-medium ${tab === 'query' ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-600'
                            }`}
                    >
                        🔍 Tra cứu
                    </button>
                </div>
            </div>

            {tab === 'products' && (
                <ProductsTab
                    batches={batches}
                    loading={loading}
                    error={error}
                />
            )}
            {tab === 'create' && (
                <CreateProductTab
                    enterprise={enterprise}
                    onSuccess={loadBatches}
                />
            )}
            {tab === 'query' && (
                <QueryTab enterprise={enterprise} />
            )}
        </div>
    )
}

function ProductsTab({
    batches,
    loading,
    error,
}: {
    batches: TeaBatch[]
    loading: boolean
    error: string | null
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Danh sách sản phẩm</CardTitle>
                <CardDescription>Tất cả batches trong hệ thống</CardDescription>
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
                            <p className="px-4 py-3 text-sm text-gray-500">Chưa có sản phẩm.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function CreateProductTab({
    enterprise,
    onSuccess,
}: {
    enterprise: { name: string; chaincode: string; channel: string }
    onSuccess: () => void
}) {
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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult('')

        try {
            const res = await invokeChaincode({
                chaincode: enterprise.chaincode,
                channel: enterprise.channel,
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
                    <CardTitle>Tạo sản phẩm mới</CardTitle>
                    <CardDescription>Tạo batch mới trong {enterprise.name}</CardDescription>
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
                            {loading ? <Spinner size={16} /> : 'Tạo sản phẩm'}
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

function QueryTab({
    enterprise,
}: {
    enterprise: { name: string; chaincode: string; channel: string }
}) {
    const [batchId, setBatchId] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string>('')
    const [error, setError] = useState<string>('')

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult('')

        try {
            const res = await queryChaincode({
                chaincode: enterprise.chaincode,
                channel: enterprise.channel,
                function: 'GetBatchInfo',
                params: [batchId],
            })

            if (res.success) {
                setResult(JSON.stringify(res.data, null, 2))
            } else {
                setError(res.error || 'Query failed')
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
                    <CardTitle>Tra cứu sản phẩm</CardTitle>
                    <CardDescription>Tìm kiếm thông tin batch trong {enterprise.name}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleQuery} className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Batch ID *</label>
                            <input
                                type="text"
                                value={batchId}
                                onChange={(e) => setBatchId(e.target.value)}
                                required
                                className="w-full rounded border px-3 py-2 text-sm focus:border-gray-700 focus:outline-none"
                                placeholder="Nhập Batch ID"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !batchId}
                            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                        >
                            {loading ? <Spinner size={16} /> : '🔍 Tra cứu'}
                        </button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Kết quả tra cứu</CardTitle>
                    <CardDescription>Thông tin chi tiết batch</CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <div className="rounded bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                    {result && (
                        <div className="rounded bg-blue-50 p-3">
                            <pre className="max-h-96 overflow-auto text-xs text-gray-700">{result}</pre>
                        </div>
                    )}
                    {!error && !result && (
                        <div className="text-sm text-gray-500">Nhập Batch ID và nhấn tra cứu</div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

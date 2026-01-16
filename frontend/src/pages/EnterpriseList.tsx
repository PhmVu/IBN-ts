import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'

interface Enterprise {
    id: string
    name: string
    chaincode: string
    channel: string
    description: string
    icon: string
}

// Hardcoded enterprises for now - can be fetched from backend later
const enterprises: Enterprise[] = [
    {
        id: 'teatrace',
        name: 'Tea Trace',
        chaincode: 'teatrace',
        channel: 'testchan',
        description: 'Hệ thống truy xuất nguồn gốc trà',
        icon: '🍃',
    },
    // Future enterprises can be added here
    // {
    //   id: 'assettrack',
    //   name: 'Asset Tracking',
    //   chaincode: 'assettrack',
    //   channel: 'testchan',
    //   description: 'Quản lý tài sản',
    //   icon: '📦',
    // },
]

export default function EnterpriseListPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Doanh nghiệp</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Danh sách các doanh nghiệp tham gia hệ thống blockchain
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enterprises.map((enterprise) => (
                    <Link key={enterprise.id} to={`/enterprises/${enterprise.id}`}>
                        <Card className="h-full transition-shadow hover:shadow-md">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{enterprise.icon}</span>
                                    <div>
                                        <CardTitle>{enterprise.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            Chaincode: {enterprise.chaincode}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600">{enterprise.description}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                    <span className="rounded bg-gray-100 px-2 py-1">
                                        Channel: {enterprise.channel}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {enterprises.length === 0 && (
                    <div className="col-span-full">
                        <Card>
                            <CardContent>
                                <p className="py-8 text-center text-sm text-gray-500">
                                    Chưa có doanh nghiệp nào trong hệ thống
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}

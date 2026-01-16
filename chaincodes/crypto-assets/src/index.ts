import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

@Info({ title: 'CryptoAssets', description: 'Crypto Assets Chaincode' })
export class CryptoAssetsContract extends Contract {

    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        const assets = [
            {
                id: 'TOKEN_GENESIS',
                owner: 'IBN_ADMIN',
                amount: 1000000,
                type: 'IBN_TOKEN'
            }
        ];

        for (const asset of assets) {
            await ctx.stub.putState(asset.id, Buffer.from(JSON.stringify(asset)));
            console.info(`Asset ${asset.id} initialized`);
        }
    }

    @Transaction()
    public async Mint(ctx: Context, id: string, amount: number): Promise<void> {
        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            throw new Error(`The asset ${id} already exists`);
        }

        const asset = {
            id,
            owner: ctx.clientIdentity.getID(),
            amount,
            type: 'IBN_TOKEN'
        };

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    @Transaction()
    public async Transfer(ctx: Context, id: string, newOwner: string): Promise<void> {
        const assetString = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetString);

        asset.owner = newOwner;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
    }

    @Transaction(false)
    @Returns('string')
    public async ReadAsset(ctx: Context, id: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }

    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, id: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    @Transaction(false)
    @Returns('string')
    public async GetAllAssets(ctx: Context): Promise<string> {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
}

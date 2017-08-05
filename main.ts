import * as Koa from 'koa'
import * as bodyParser from 'koa-bodyparser'
import {router} from './routes'
import {errorHandler, spaHandler} from './middlewares'
import {Service as ModelService} from './models'
import {MongoClient, Db} from 'mongodb'

declare module "koa" {
    interface BaseContext {
        db: Db,
        models: ModelService,
    }
}

const main = async () => {
  const app = new Koa()
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/moba'
  console.log(`Connecting to the database [ ${mongoUri} ]`)
  app.context.db = await MongoClient.connect(mongoUri)
  app.context.models = new ModelService(app.context.db)
  console.log("Creating indexes..")
  await app.context.models.createIndexes()

  app.use(errorHandler)
  app.use(bodyParser())
  app.use(router.routes())
  app.use(router.allowedMethods())
  app.use(spaHandler)
  console.log("Listening on port 3000.")
  app.listen(3000)
}

main()

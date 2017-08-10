import {Db} from 'mongodb'
import { assert, testDB } from '../helper'
import { IPlayer } from '../../models/player'
import { IGame } from '../../models/game'
import { Service } from '../../models'

describe('PlayerService', () => {
  let db: Db
  let service: Service
  beforeEach(() => {
    return async function() {
      db = await testDB()
      service = new Service(db)
      await service.createIndexes()
    }()
  })

  describe('#create', () => {
    let createdPlayer: IPlayer
    beforeEach(() => {
      return async function() {
        createdPlayer = await service.player.create('foo')
      }()
    })

    it('create a new player with the given name', () => {
      assert.equal(createdPlayer.name, 'foo')
    })

    it('has default rating of 0', () => {
      assert.equal(createdPlayer.rating, 0)
    })

    it('actually saved the player', () => {
      return assert.eventually.equal(db.collection('players').count({}), 1)
    })

    it('reject player with the duplicated name', () => {
      return assert.isRejected(service.player.create('foo'))
    })

    it('allow initial rating overide', () => {
      return async function () {
        const p = await service.player.create('bar', 10)
        assert.equal(p.rating, 10)
      }()
    })
  })

  describe('#list', () => {
    let players: IPlayer[]
    beforeEach(() => {
      return async function() {
        let results: Promise<IPlayer>[] = []
        for(let i = 0; i < 60; i++) {
          results.push(service.player.create(`player-${i}`))
        }
        players = await Promise.all(results)
      }()
    })

    it('return list of 50 players by default', () => {
      return async function() {
        const pList = await service.player.list()
        assert.equal(pList.length, 50)
      }()
    })

    it('accept other limit', () => {
      return async function() {
        const pList = await service.player.list({limit: '5'})
        assert.equal(pList.length, 5)
      }()
    })
  })

  describe('#enrich', () => {
    let players: IPlayer[]
    let games: IGame[]
    beforeEach(() => {
      return async function() {
        let results: Promise<IPlayer>[] = []
        for(let i = 0; i < 3; i++) {
          results.push(service.player.create(`player-${i}`))
        }
        players = await Promise.all(results)
        games = await Promise.all([
          service.game.create([
            players[0]._id.toHexString(), players[1]._id.toHexString()]),
          service.game.create([
            players[0]._id.toHexString(), players[2]._id.toHexString()]),
        ])
      }()
    })

    it('return total games the player participated in', () => {
      return async function() {
        const enrichedPlayers = await Promise.all([
          service.player.enrich(players[0]),
          service.player.enrich(players[1]),
          service.player.enrich(players[2]),
        ])
        assert.equal(enrichedPlayers[0].totalGames, 2)
        assert.equal(enrichedPlayers[1].totalGames, 1)
        assert.equal(enrichedPlayers[2].totalGames, 1)
      }()
    })

    it('return recent games result', () => {
      return async function() {
        await service.game.submitResult(games[0]._id.toHexString(), 0)
        await service.game.submitResult(games[1]._id.toHexString(), 1)
        const enrichedPlayer = await service.player.enrich(players[0])
        assert.deepEqual(enrichedPlayer.recentResults, [false, true])
      }()
    })
  })
})
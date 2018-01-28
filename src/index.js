/**
 *
 * @module recursion-schemes
 */
;(() => {
  'use strict'

  /* imports */
  const curry = require('fun-curry')
  const { inputs } = require('guarded')
  const { map: oMap, ap: oAp } = require('fun-object')
  const { any, tuple, hasFields, fun } = require('fun-type')
  const { id, pipeAll, composeAll } = require('fun-function')
  const { split } = require('fun-arrow')

  /**
   * unfix >>> map(cata({ map, unfix }, alg)) >>> alg
   *
   * Recursive implementation (not stack safe)
   *
   * @function module:recursion-schemes.cataR
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} term.unfix - term f -> f (term f)
   * @param {Function} alg - f a -> a
   * @param {*} x - structure to reduce
   *
   * @return {*} x reduced by recursively applying alg to x
   */
  const cataR = ({ map, unfix }, alg, x) =>
    pipeAll([unfix, curry(map)(curry(cataR)({ map, unfix }, alg)), alg])(x)

  /**
   * fix <<< map(ana({ map, fix }, coalg)) <<< coalg
   *
   * Recursive implementation (not stack safe)
   *
   * @function module:recursion-schemes.anaR
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} term.fix - f (term f) -> term f
   * @param {Function} coalg - a -> f a
   * @param {*} x - seed to build structure from
   *
   * @return {*} x built up by recursively applying coalg to x
   */
  const anaR = ({ map, fix }, coalg, x) =>
    composeAll([fix, curry(map)(curry(anaR)({ map, fix }, coalg)), coalg])(x)

  /**
   * alg <<< map(hylo({ map }, alg, coalg)) <<< coalg
   *
   * Recursive implementation (not stack safe)
   *
   * @function module:recursion-schemes.hyloR
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} alg - f a -> a
   * @param {Function} coalg - a -> f a
   * @param {*} x - seed to build structure from
   *
   * @return {*} x built up by recursively applying coalg to x
   */
  const hyloR = ({ map }, alg, coalg, x) =>
    composeAll([alg, curry(map)(curry(hyloR)({ map }, alg, coalg)), coalg])(x)

  /**
   * unfix >>> map(id &&& para({ map, unfix }, ralg)) >>> ralg
   *
   * Recursive implementation (not stack safe)
   *
   * @function module:recursion-schemes.paraR
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} term.unfix - term f -> f (term f)
   * @param {Function} ralg - f (term f, a) -> a
   * @param {*} x - structure to reduce
   *
   * @return {*} x reduced by recursively applying ralg to (term f, a)
   */
  const paraR = ({ map, unfix }, ralg, x) =>
    pipeAll([
      unfix,
      curry(map)(split(id, curry(paraR)({ map, unfix }, ralg))),
      ralg
    ])(x)

  /**
   * fix <<< map(id ||| apo({ map, unfix }, rcoalg)) <<< rcoalg
   *
   * Recursive implementation (not stack safe)
   *
   * @function module:recursion-schemes.apoR
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} term.fix - term f -> f (term f)
   * @param {Function} term.either -
   *   (term f -> term f, a -> term f) -> (term f | a) -> term f
   *
   * @param {Function} rcoalg - a -> f (term f | a)
   * @param {*} x - seed to build structure from
   *
   * @return {*} x built up by recursively applying rcoalg to x
   */
  const apoR = ({ map, fix, either }, rcoalg, x) =>
    composeAll([
      fix,
      curry(map)(either(id, curry(apoR)({ map, fix, either }, rcoalg))),
      rcoalg
    ])(x)

  /**
   * unfix >>> map(cata({ map, unfix }, alg)) >>> alg
   *
   * Iterative implementation (stack safe)
   *
   * @function module:recursion-schemes.cata
   *
   * @param {Object} term - Functorial, recursive data type
   * @param {Function} term.map - (a -> b, f a) -> f b
   * @param {Function} term.unfix - term f -> f (term f)
   * @param {Function} alg - f a -> a
   * @param {*} x - structure to reduce
   *
   * @return {*} x reduced by recursively applying alg to x
   */
  const cata = ({ map, unfix }, alg, x) => {
    const q = [unfix(x)]
    const rs = []

    for (let i = 0, called, next = [0]; next.length; i++, called = false) {
      q[i] = map(x => {
        called = true
        q.push(unfix(x))
        next.push(q.length - 1)

        return q.length - 1
      }, q[next.shift()])

      called && rs.unshift(i)
    }

    rs.forEach(j => { q[j] = map(x => alg(q[x]), q[j]) })

    return alg(q[0])
  }

  /* exports */
  const api = { cataR, anaR, hyloR, paraR, apoR, cata }

  const guards = oMap(inputs, {
    cataR: tuple([hasFields({ map: fun, unfix: fun }), fun, any]),
    anaR: tuple([hasFields({ map: fun, fix: fun }), fun, any]),
    hyloR: tuple([hasFields({ map: fun }), fun, fun, any]),
    paraR: tuple([hasFields({ map: fun, unfix: fun }), fun, any]),
    apoR: tuple([hasFields({ map: fun, fix: fun, either: fun }), fun, any]),
    cata: tuple([hasFields({ map: fun, unfix: fun }), fun, any])
  })

  module.exports = oMap(curry, oAp(guards, api))
})()


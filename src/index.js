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
  const { pipeAll, composeAll } = require('fun-function')

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

  /* exports */
  const api = { cataR, cata, anaR }

  const guards = oMap(inputs, {
    cataR: tuple([hasFields({ map: fun, unfix: fun }), fun, any]),
    cata: tuple([hasFields({ map: fun, unfix: fun }), fun, any]),
    anaR: tuple([hasFields({ map: fun, fix: fun }), fun, any])
  })

  module.exports = oMap(curry, oAp(guards, api))
})()


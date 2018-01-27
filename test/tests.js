;(() => {
  'use strict'

  /* imports */
  const arrange = require('fun-arrange')
  const { equal, equalDeep } = require('fun-predicate')
  const { sync } = require('fun-test')
  const { ap, get } = require('fun-object')
  const { gt, add, mul } = require('fun-scalar')
  const { map, update, drop, first, range, prepend, append, flatten } =
    require('fun-array')
  const { compose, id, k, argsToArray } = require('fun-function')
  const { tuple, array, num, string } = require('fun-type')
  const { fromArray, isEmpty: isNil, empty: nil } = require('fun-list')
  const { first: poly } = require('fun-case')
  const { split, parallel: both } = require('fun-arrow')

  const listMap = (f, l) => poly([
    [isNil, id],
    [k(true), update(1, f)]
  ])(l)

  const listF = {
    map: listMap,
    unfix: id,
    fix: id
  }

  const exprF = (() => {
    const add = (a, b) => ['add', [a, b]]
    const sub = (a, b) => ['sub', [a, b]]
    const mul = (a, b) => ['mul', [a, b]]
    const max = (xs) => ['max', xs]

    const compute = poly([
      [num, id],
      [tuple([equal('add'), array]), ([_, [a, b]]) => a + b],
      [tuple([equal('sub'), array]), ([_, [a, b]]) => a - b],
      [tuple([equal('mul'), array]), ([_, [a, b]]) => a * b],
      [tuple([equal('max'), array]), ([_, xs]) => Math.max.apply(null, xs)]
    ])

    const print = poly([
      [num, id],
      [tuple([equal('add'), array]), ([_, [a, b]]) => `(${a} + ${b})`],
      [tuple([equal('sub'), array]), ([_, [a, b]]) => `(${a} - ${b})`],
      [tuple([equal('mul'), array]), ([_, [a, b]]) => `(${a} * ${b})`],
      [tuple([equal('max'), array]), ([_, xs]) => `max(${xs})`]
    ])

    const unfix = id
    const emap = (f, e) => poly([
      [num, id],
      [tuple([string, array]), update(1, map(f))]
    ])(e)

    return { max, add, sub, mul, map: emap, compute, unfix, print }
  })()

  const arrayF = {
    map: listMap,
    unfix: poly([[isNil, id], [k(true), split(first, drop(1))]]),
    fix: poly([[isNil, id], [k(true), argsToArray(prepend)]])
  }

  const natTerm = {
    map: listMap,
    unfix: poly([
      [equalDeep(0), k([])],
      [k(true), n => [1, n - 1]]
    ])
  }

  const treeMap = (f, t) => poly([
    [isNil, id],
    [x => x.length === 1, id],
    [x => x.length === 2, ([a, b]) => [f(a), f(b)]]
  ])(t)

  const treeTerm = {
    map: treeMap,
    unfix: id
  }

  const sum = poly([
    [isNil, k(0)],
    [x => x.length === 1, ([x]) => x],
    [k(true), argsToArray(add)]
  ])

  const upTo = n => poly([
    [gt(n), nil],
    [k(true), split(id, add(1))]
  ])

  const length = poly([[isNil, k(0)], [k(true), ([_, n]) => 1 + n]])

  const square = x => x * x
  const squares = poly([
    [isNil, nil],
    [k(true), both(square, id)]
  ])

  const sumOfSquares = poly([
    [isNil, k(0)],
    [k(true), compose(argsToArray(add), both(square, id))]
  ])

  const prod = poly([
    [isNil, k(1)],
    [k(true), argsToArray(mul)]
  ])

  const expr1 = exprF.add(exprF.mul(2, 3), exprF.sub(5, 2))
  const expr2 = exprF.add(exprF.mul(2, 3), exprF.max([4, 2, 8, 1]))
  const expr3 = exprF.add(
    exprF.mul(2, 3),
    exprF.max([4, exprF.sub(9, 1), 2, 1])
  )

  const tests = map(
    compose(
      ap({ predicate: equalDeep, contra: get }),
      arrange({ inputs: 0, predicate: 1, contra: 2 })
    ),
    flatten([
      flatten(map(split(append('cata'), append('cataR')), [
        [[listF, length, fromArray(range(0, 9))], 10],
        [[listF, sum, []], 0],
        [[listF, sum, [1, []]], 1],
        [[listF, sum, fromArray([1, 2, 3])], 6],
        [[listF, prod, fromArray([2, 3, 4])], 24],
        [[listF, squares, fromArray([1, 2, 3])], [1, [4, [9, []]]]],
        [[listF, sum, fromArray([1, 4, 9])], 14],
        [[listF, sumOfSquares, fromArray([1, 2, 3])], 14],
        [[arrayF, sum, [1, 2, 3]], 6],
        [[arrayF, prod, [2, 3, 4]], 24],
        [[natTerm, sum, 10], 10],
        [[treeTerm, sum, [[], [[1], [[2], [3]]]]], 6],
        [[exprF, exprF.compute, expr1], 9],
        [[exprF, exprF.print, expr1], '((2 * 3) + (5 - 2))'],
        [[exprF, exprF.compute, expr2], 14],
        [[exprF, exprF.print, expr2], '((2 * 3) + max(4,2,8,1))'],
        [[exprF, exprF.compute, expr3], 14],
        [[exprF, exprF.print, expr3], '((2 * 3) + max(4,(9 - 1),2,1))']
      ])),
      map(append('anaR'), [
        [[listF, upTo(3), 0], [0, [1, [2, [3, []]]]]],
        [[arrayF, upTo(3), 0], [0, 1, 2, 3]]
      ])
    ])
  )

  /* exports */
  module.exports = map(sync, tests)
})()


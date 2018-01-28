;(() => {
  'use strict'

  /* imports */
  const arrange = require('fun-arrange')
  const { and, equal, equalDeep } = require('fun-predicate')
  const { sync } = require('fun-test')
  const { ap, get: oGet } = require('fun-object')
  const { gt, add, mul } = require('fun-scalar')
  const { map, update, drop, first, range, prepend, append, flatten, get,
    flattenR } = require('fun-array')
  const { compose, id, k, argsToArray } = require('fun-function')
  const { any, tuple, array, num, string } = require('fun-type')
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
    fix: id,
    either: (l, r) => poly([
      [tuple([equal('left'), any]), update(1, l)],
      [tuple([equal('right'), any]), update(1, r)],
      [k(true), x => { throw Error(`non-total matching ${JSON.stringify(x)}`) }]
    ])
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

    const paraPrint = poly([
      [tuple([any, num]), id],
      [
        tuple([any, tuple([equal('add'), array])]),
        ([x, [_, [a, b]]]) => `[${flattenR(x).length}](${a} + ${b})`
      ],
      [
        tuple([any, tuple([equal('sub'), array])]),
        ([x, [_, [a, b]]]) => `[${flattenR(x).length}](${a} - ${b})`
      ],
      [
        tuple([any, tuple([equal('mul'), array])]),
        ([x, [_, [a, b]]]) => `[${flattenR(x).length}](${a} * ${b})`
      ],
      [
        tuple([any, tuple([equal('max'), array])]),
        ([x, [_, xs]]) => `[${flattenR(x).length}]max(${xs})`
      ]
    ])

    const unfix = id
    const emap = (f, e) => poly([
      [num, id],
      [tuple([string, array]), update(1, map(f))]
    ])(e)

    return { max, add, sub, mul, map: emap, compute, unfix, print, paraPrint }
  })()

  const arrayF = {
    map: listMap,
    unfix: poly([[isNil, id], [k(true), split(first, drop(1))]]),
    fix: poly([[isNil, id], [k(true), argsToArray(prepend)]])
  }

  const natF = {
    map: listMap,
    fix: ([_, [_1, x]]) => x,
    unfix: poly([
      [equalDeep(0), k([])],
      [k(true), n => [1, n - 1]]
    ]),
    either: (l, r) => poly([
      [tuple([equal('left'), any]), update(1, l)],
      [tuple([equal('right'), any]), update(1, r)],
      [k(true), x => { throw Error(`non-total matching ${JSON.stringify(x)}`) }]
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

  const tails = poly([
    [isNil, k([nil(), nil()])],
    [k(true), ([a, [as, tls]]) => [[a, as], tls]]
  ])

  const fac = poly([
    [isNil, k(1)],
    [k(true), ([_, [n, m]]) => (1 + n) * m]
  ])

  const paraSum = poly([
    [isNil, k(0)],
    [k(true), compose(sum, update(1, get(1)))]
  ])

  const ite = (p, t, f, x) => p(x) ? t(x) : f(x)
  const left = x => ['left', x]
  const right = x => ['right', x]
  const findNat = p => x =>
    ite(
      compose(p, get(1)),
      update(1, left),
      update(1, right),
      split(id, add(1))(x)
    )
  const isSquare = x => Math.sqrt(x) === Math.floor(Math.sqrt(x))

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
      ap({ predicate: equalDeep, contra: oGet }),
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
        [[natF, sum, 10], 10],
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
      ]),
      map(append('hyloR'), [
        [[listF, sum, upTo(0), 0], 0],
        [[listF, sum, upTo(10), 0], 55],
        [[listF, sum, upTo(100), 0], 5050]
      ]),
      map(append('paraR'), [
        [[listF, paraSum, []], 0],
        [[listF, paraSum, fromArray(range(0, 10))], 55],
        [[listF, paraSum, fromArray(range(0, 10))], 55],
        [
          [listF, tails, fromArray(range(1, 3))],
          [[1, [2, [3, []]]], [[2, [3, []]], [[3, []], [[], []]]]]
        ],
        [[arrayF, paraSum, range(0, 10)], 55],
        [[natF, fac, 3], 6],
        [[natF, fac, 4], 24],
        [[natF, fac, 10], 3628800]
      ]),
      map(append('apoR'), [
        [[natF, findNat(and(gt(10), isSquare)), 0], 16],
        [[listF, findNat(equal(1)), 0], [0, ['left', 1]]]
      ])
    ])
  )

  /* exports */
  module.exports = map(sync, tests)
})()


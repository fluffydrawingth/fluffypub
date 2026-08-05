import { deltaEOk, type OklabColor } from '@/shared/color'
import { createSeededRandom } from '@/shared/lib/random'

export interface WeightedPoint {
  color: OklabColor
  weight: number
}

function pickWeightedIndex(weights: number[], total: number, random: () => number): number {
  let target = random() * total
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i]
    if (target <= 0) return i
  }
  return weights.length - 1
}

/** k-means++ seeding: spreads initial centroids across the color space instead of clumping. */
function initializeCentroids(
  points: WeightedPoint[],
  k: number,
  random: () => number,
): OklabColor[] {
  const centroids: OklabColor[] = []
  const totalWeight = points.reduce((sum, p) => sum + p.weight, 0)
  const first = points[pickWeightedIndex(points.map((p) => p.weight), totalWeight, random)]
  centroids.push(first.color)

  while (centroids.length < k) {
    const distSq = points.map((p) => {
      const nearest = Math.min(...centroids.map((c) => deltaEOk(p.color, c) ** 2))
      return nearest * p.weight
    })
    const total = distSq.reduce((sum, d) => sum + d, 0)
    if (total === 0) {
      centroids.push(points[Math.floor(random() * points.length)].color)
      continue
    }
    centroids.push(points[pickWeightedIndex(distSq, total, random)].color)
  }

  return centroids
}

export interface ClusterResult {
  centroid: OklabColor
  population: number
}

export function weightedKMeans(
  points: WeightedPoint[],
  k: number,
  seed: number,
  maxIterations = 20,
): ClusterResult[] {
  const random = createSeededRandom(seed)
  let centroids = initializeCentroids(points, k, random)
  let assignments = new Array(points.length).fill(0)

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false

    for (let i = 0; i < points.length; i++) {
      let bestIndex = 0
      let bestDist = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const dist = deltaEOk(points[i].color, centroids[c])
        if (dist < bestDist) {
          bestDist = dist
          bestIndex = c
        }
      }
      if (assignments[i] !== bestIndex) changed = true
      assignments[i] = bestIndex
    }

    const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, weight: 0 }))
    for (let i = 0; i < points.length; i++) {
      const sum = sums[assignments[i]]
      const { color, weight } = points[i]
      sum.l += color.l * weight
      sum.a += color.a * weight
      sum.b += color.b * weight
      sum.weight += weight
    }

    centroids = sums.map((sum, index) =>
      sum.weight > 0
        ? { l: sum.l / sum.weight, a: sum.a / sum.weight, b: sum.b / sum.weight }
        : centroids[index],
    )

    if (!changed) break
  }

  const populations = new Array(k).fill(0)
  for (let i = 0; i < points.length; i++) populations[assignments[i]] += points[i].weight

  return centroids.map((centroid, index) => ({ centroid, population: populations[index] }))
}

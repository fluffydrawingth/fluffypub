import type { MarkerRepository } from '../repository/MarkerRepository'

export async function exportAllAsJson(repository: MarkerRepository): Promise<string> {
  const data = await repository.exportAll()
  return JSON.stringify(data, null, 2)
}

export async function importAllFromJson(jsonText: string, repository: MarkerRepository): Promise<void> {
  const parsed = JSON.parse(jsonText)
  const data = {
    brands: parsed.brands ?? [],
    series: parsed.series ?? [],
    references: parsed.references ?? [],
    commercialSets: parsed.commercialSets ?? [],
    userSets: parsed.userSets ?? [],
  }
  await repository.importAll(data)
}

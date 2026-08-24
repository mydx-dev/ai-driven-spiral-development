import { describe, expectTypeOf, it } from "vitest";
import type { Artifact, ArtifactRepository } from "./Artifact";

class CustomArtifact implements Artifact {
  constructor(
    public readonly id: string,
    public readonly foo: string,
    public readonly bar: number,
  ) {}
}

class CustomArtifactRepository implements ArtifactRepository<CustomArtifact> {
  find(id: string): Promise<CustomArtifact | undefined> {
    return Promise.resolve(undefined);
  }

  findByCycle(cycleId: string): Promise<CustomArtifact[]> {
    return Promise.resolve([]);
  }

  save(artifact: CustomArtifact): Promise<void> {
    return Promise.resolve();
  }
}

describe("アーティファクト", () => {
  it("利用側で任意の構造を持つアーティファクトを定義できる", () => {
    expectTypeOf<CustomArtifact>().toMatchTypeOf<Artifact>();
  });

  it("任意のアーティファクトに対するリポジトリを利用側で実装できる", () => {
    expectTypeOf<CustomArtifactRepository>().toMatchTypeOf<
      ArtifactRepository<CustomArtifact>
    >();
  });

  it("アーティファクトリポジトリはIDからアーティファクトを取得できる", () => {
    expectTypeOf<
      Parameters<CustomArtifactRepository["find"]>[0]
    >().toEqualTypeOf<string>();

    expectTypeOf<ReturnType<CustomArtifactRepository["find"]>>().toEqualTypeOf<
      Promise<CustomArtifact | undefined>
    >();
  });

  it("アーティファクトリポジトリはサイクルに属するアーティファクトを取得できる", () => {
    expectTypeOf<
      Parameters<CustomArtifactRepository["findByCycle"]>[0]
    >().toEqualTypeOf<string>();

    expectTypeOf<
      ReturnType<CustomArtifactRepository["findByCycle"]>
    >().toEqualTypeOf<Promise<CustomArtifact[]>>();
  });

  it("アーティファクトリポジトリはアーティファクトを保存できる", () => {
    expectTypeOf<
      Parameters<CustomArtifactRepository["save"]>[0]
    >().toEqualTypeOf<CustomArtifact>();

    expectTypeOf<ReturnType<CustomArtifactRepository["save"]>>().toEqualTypeOf<
      Promise<void>
    >();
  });
});

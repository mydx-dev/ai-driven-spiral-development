import type { FeedbackChangeState } from "@mydx-dev/spiral-standard";
import { standardGitHubArtifactIssueTemplatesByKey } from "./IssueTemplates.mjs";
import type {
  StandardArtifact,
  StandardArtifactIssueCodec,
} from "./StandardArtifactIssueRepository.js";

export class StandardFeedbackState implements StandardArtifact {
  constructor(
    public readonly id: string,
    public readonly cycleId: string,
    public readonly newInformation: FeedbackChangeState,
    public readonly changedInformation: FeedbackChangeState,
    public readonly needNextCycle: boolean,
  ) {}
}

const feedbackTemplate =
  standardGitHubArtifactIssueTemplatesByKey.feedbackState;

export const feedbackStateIssueCodec: StandardArtifactIssueCodec<StandardFeedbackState> =
  {
    artifactType: feedbackTemplate.artifactType,
    title: (state) => `${feedbackTemplate.titlePrefix} ${state.cycleId}`,
    restore: (payload) => {
      if (!payload || typeof payload !== "object") {
        throw new Error("Feedback state payload must be an object.");
      }
      return Object.assign(
        Object.create(StandardFeedbackState.prototype),
        payload,
      ) as StandardFeedbackState;
    },
    traceability: () => [],
    sections: (state) => [
      {
        heading: "## Next-cycle Decision",
        body: state.needNextCycle
          ? "- [x] Start next Cycle"
          : "- [ ] No next Cycle",
      },
    ],
  };

import { BadRequestException } from "@nestjs/common";
import { Scene } from "../../scenes/entities/scene.entity";
import { CreateWorkflowDto } from "../../workflow/dto/create-workflow.dto";
import { RenderStrategy, RenderStrategyContext } from "./render-strategy";
import { RenderStrategyResult } from "./render-strategy-result";
import { WorkflowBuilder } from "../../workflow/builder/workflow.builder";


export class SimpleSingleLayerRenderStrategy implements RenderStrategy {
  
  
  async generateRenderWorkflow(scene: Scene, context: RenderStrategyContext): Promise<RenderStrategyResult> {
    if (scene.layers.length === 0 || scene.layers.length > 1) {
      throw new BadRequestException('The render strategy SimpleSingleRenderStrategy requires exactly one layer');
    }

    let result: RenderStrategyResult = {
      workflow: null,
      warnings: []
    };

    const layer = scene.layers[0];
    const clips = layer.clips;

    const workflow = new WorkflowBuilder();

    workflow.withName(scene.id);
    workflow.withDescription(`Rendering video ${scene.video.name} with ${clips.length} clips for scene ${scene.id}`);

    const clipPrepArtifactIds: Map<string, string> = new Map();
    for (const clip of clips.filter(clip => clip.cut)) {
      const artifactId = `${context.workspace._s3BasePath}processing-artifacts/clip-cut-${clip.cut.from}-${clip.cut.to}-${clip.id}`;
      
      const clipS3Path = context.workspace.files.find(file => file.name === clip.id)._s3Path;      
      
      workflow.withTask(task => {
        task.withName('Split') // Split is the workflow name for the cut operation
          .withResult(artifactId)
          .withParameters({
            keyName: clipS3Path,
            from: clip.cut.from,
            to: clip.cut.to,
          })
          .withArtifactCompletionCriteria(artifactId)
          .withDefaultRetryPolicy();
      });

      clipPrepArtifactIds.set(clip.id, artifactId);
    }

    const finalVideoPath = `${context.workspace._s3BasePath}video/${scene.video.name}`;

    // create the final task that will merge all the clips
    workflow.withTask(t => {
      t.withName('Splice')
       .withResult(finalVideoPath)
       .withArtifactCompletionCriteria(finalVideoPath)
       .withDefaultRetryPolicy();
      
      // add artifact dependencies
      for (const ids of clipPrepArtifactIds.values()) {
        t.withArtifactDependency(ids);
      }

      // order clips in the right order
      const clipOrder = clips.sort((a, b) => a.from - b.from);

      // check for gaps between clips
      for (let i = 0; i < clipOrder.length - 1; i++) {
        if (clipOrder[i].to !== clipOrder[i + 1].from) {
          result.warnings.push(`There is a gap between clip ${clipOrder[i].id} and clip ${clipOrder[i + 1].id} of ${clipOrder[i + 1].from - clipOrder[i].to} seconds`);
        }
      }

      if (clipOrder[0].from !== 0) {
        result.warnings.push(`The first clip does not start at 0 seconds. All videos will be pushed forward until the first clip starts at 0 seconds`);
        const offset = clipOrder[0].from;
        for (const clip of clipOrder) {
          clip.from -= offset;
          clip.to -= offset;
        }
      }

      t.withParameters({
        fileKeys: clipOrder.map(clip => clipPrepArtifactIds.get(clip.id) ?? `${context.workspace._s3BasePath}${clip.id}`), 
      })
    });

    workflow.withArtifactCompletionCriteria(finalVideoPath);

    result.workflow = workflow.build();
    return result;
  }

}

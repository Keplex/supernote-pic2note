export type PreviewStatus = 'idle' | 'rendering';
/** Start immediately. While busy, retain only the newest recipe, never a render backlog. */
export class PreviewQueue<Input, Output> {
  private revision=0; private pending?:{input:Input;revision:number}; private running=false;
  private render:(input:Input)=>Promise<Output>;private publish:(output:Output)=>void;
  private failed:(error:unknown)=>void;private status:(status:PreviewStatus)=>void;
  constructor(render:(input:Input)=>Promise<Output>,publish:(output:Output)=>void,
    failed:(error:unknown)=>void,status:(status:PreviewStatus)=>void) {this.render=render;this.publish=publish;this.failed=failed;this.status=status;}
  request(input:Input) {this.pending={input,revision:++this.revision};this.status('rendering');void this.pump();}
  cancel() {this.pending=undefined;++this.revision;this.status('idle');}
  private async pump() {
    if(this.running || !this.pending)return;
    const job=this.pending;this.pending=undefined;this.running=true;
    try {const result=await this.render(job.input);if(job.revision===this.revision)this.publish(result);}
    catch(error) {if(job.revision===this.revision)this.failed(error);}
    finally {this.running=false;if(job.revision===this.revision)this.status('idle');void this.pump();}
  }
}

export default class BasePlugin {
  public static pluginName: string = '';
  public pluginHooks: string[]; // 不用指定，通过Inject自动添加
  public defaultOptions: any = {};
  public options: any = {};

  constructor(options = {}) {
    this.options = Object.assign({}, this.defaultOptions, options);
  }
}

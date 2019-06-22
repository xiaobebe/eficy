import BasePlugin from './base';
import EficyController from '../core/Controller';
import axios, { Method } from 'axios';
import { IActionProps, IEficySchema } from '../interface';
import { generateUid, isArray } from '../utils';

type IRequstMethod = (requestParams: IRequst) => Promise<IActionProps>;

declare module '../core/Controller' {
  export default interface EficyController {
    request: (requestParams: IRequst & { '#'?: string } | string) => Promise<IActionProps>;
  }
}

interface IRequst {
  '#'?: string;
  url?: string;
  immediately?: boolean;
  method?: Method;
  data?: any;
  params?: any;
  format?: (beforeData: any) => IActionProps;
}

export default class Request extends BasePlugin {
  public static pluginName: string = 'request';
  private needImmediatelyRequests: IRequst[] = [];
  public static defaultFormat(resData): IActionProps {
    return resData;
  }
  public static request: IRequstMethod = async function(requestParams) {
    const { url = '', method = 'GET', data = {}, params = {}, format = this.defaultFormat } = requestParams;

    try {
      const res = await axios({ url, method, data, params });
      if (!res.data) {
        throw new Error('no data return');
      }
      return format(res.data);
    } catch (e) {
      return {
        action: 'fail',
        data: { msg: e.message },
      };
    }
  };

  public loadOptions(data: IEficySchema & { requests?: IRequst | IRequst[] }) {
    let { requests } = data;
    if (requests && !isArray(requests)) {
      requests = [requests];
    }
    this.options.requests = requests || [];
  }

  private requestMap: Record<string, IRequst> = {};

  public async request(requestParams: IRequst & { '#'?: string } | string) {
    if (typeof requestParams === 'string') {
      requestParams = { '#': requestParams };
    }
    const { '#': id = '', ...restConfig } = requestParams;
    const presetRequestConfig = this.requestMap[id] || {};

    const requestConfig = this.controller.replaceVariables(Object.assign({}, presetRequestConfig, restConfig));
    const action = await Request.request(requestConfig);

    this.controller.run(action);

    return action;
  }

  public bindController(param: EficyController) {
    super.bindController(param);
    this.controller.request = this.request.bind(this);
    this.options.requests.forEach(request => this.addRequest(request));
    this.loadViewRequest();
    this.runImmediatelyRequests();
  }

  private loadViewRequest() {
    const viewDataMap = this.controller.model.viewDataMap;
    Object.keys(viewDataMap).forEach(key => {
      const { '#request': requestOpt } = viewDataMap[key] as any;
      if (requestOpt) {
        this.addRequest(requestOpt);
      }
    });
  }

  private addRequest(request: IRequst) {
    if (!request['#']) {
      request['#'] = generateUid();
    }

    if (request.immediately === true) {
      this.needImmediatelyRequests.push(request);
    }

    this.requestMap[request['#']] = request;
  }

  private runImmediatelyRequests() {
    this.needImmediatelyRequests.forEach(this.request.bind(this));
  }
}

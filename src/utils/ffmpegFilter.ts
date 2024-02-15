type FilterArgumentValue = string | number;
type FilterArgument = FilterArgumentValue | Record<string, FilterArgumentValue | FileArgument> | FilterArgumentValue[];
type FilterFunction = (...args: FilterArgument[]) => Filter;

/**
 * 包含了在函数式过滤器表达式中包含的可用上下文函数。
 */
interface FilterComplexContext {
  /**
   * 从一系列输入管道中构建过滤器链。返回一个空的过滤器节点。
   */
  from: (...labels: Pipe[]) => ChainNode;
  /**
   * 创建指定名称的管道，若未指定名词则创建匿名管道。
   */
  pipe: (name?: string) => Pipe;
  /**
   * 输入管道。
   */
  input: Record<number, Record<string | number, Pipe>>;
  /**
   * 过滤器。
   */
  filter: Record<string, FilterFunction>;
  /**
   * 创建文件参数。
   */
  fileArgument: (path: string) => FileArgument;
}

/**
 * 过滤器节点。
 */
interface ChainNode extends Iterable<Pipe> {
  /**
   * 将该节点连接至一个新的过滤器，并返回连接后的节点。若自身为空节点则将自身替换该过滤器节点。
   */
  pipe(filter: Filter | FilterFunction): ChainNode;
  /**
   * 以当前节点对应数量的输出管道作为输入管道创建新的过滤器节点。
   */
  fork(connectedPipeCount: number): ChainNode;
  /**
   * 将当前节点的输出连接至对应的管道。
   */
  connect(...pipes: Pipe[]): ChainNode;
  /** 
   * 将两个过滤器节点连接。
   */
  link(node: ChainNode): ChainNode;
}

type PipeMediaType = 'unknown' | 'video' | 'audio' | 'data' | 'subtitle' | 'attachment' | 'nb';

/**
 * 管道。
 */
class Pipe {
  name: string;
  fixed: boolean;
  mediaType: PipeMediaType = 'unknown';
  boundInput = false;

  constructor(name: string, fixed?: boolean) {
    this.name = name;
    this.fixed = fixed ?? false;
  }

  /** 
   * 为匿名管道赋予名称。
   */
  as(newName: string) {
    if (this.fixed) {
      throw new Error(`Cannot rename a fixed pipe`);
    }
    this.name = newName;
    this.fixed = true;
    return this;
  }

  /** 
   * 标记管道的媒体类型。
   */
  mark(mediaType: PipeMediaType) {
    if (this.mediaType !== 'unknown') {
      throw new Error(`Cannot mark this pipe as ${mediaType}, since it has been marked as ${this.mediaType}`);
    }
    this.mediaType = mediaType;
    return this;
  }

  setBoundInput() {
    if (this.boundInput) {
      throw new Error('Pipe has been bound to output');
    }
    this.boundInput = true;
    return this;
  }

  toString() {
    return `[${this.name}]`;
  }
}

const InputProxy = new Proxy<Record<number, Record<string | number, Pipe>>>({}, {
  ownKeys() {
    return [];
  },
  get(target, inputIndex) {
    if (inputIndex in target) {
      return target[inputIndex as unknown as number];
    }
    const streamProxy = new Proxy<Record<string | number, Pipe>>({}, {
      ownKeys() {
        return [];
      },
      get(target, streamIndex) {
        if (streamIndex in target) {
          return target[streamIndex as string];
        }
        const pipe = new Pipe(`${inputIndex as string}:${streamIndex as string}`);
        pipe.setBoundInput();
        target[streamIndex as string] = pipe;
        return pipe;
      },
    });
    target[inputIndex as unknown as number] = streamProxy;
    return streamProxy;
  },
});

class FileArgument {
  path: string;

  constructor(path: string) {
    this.path = path;
  }
}

const FileArgumentFactory = (path: string) => new FileArgument(path);

function escapeFilterArgumentValue(value: FilterArgumentValue): string {
  if (typeof value === 'string') {
    return value.replace(/[\\:']/g, '\\$&');
  }
  return String(value);
}

function parseFilterArguments(args: FilterArgument[]): string {
  if (args.length === 1 && typeof args[0] === 'string') {
    return args[0];
  }
  const parts: string[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      parts.push(...arg.map((e) => escapeFilterArgumentValue(e)));
    } else if (typeof arg === 'object') {
      parts.push(...Object.entries(arg).map(([k, v]) => {
        if (v instanceof FileArgument) {
          return `/${k}=${escapeFilterArgumentValue(v.path)}`;
        }
        return `${k}=${escapeFilterArgumentValue(v)}`;
      }));
    } else {
      parts.push(escapeFilterArgumentValue(arg));
    }
  }
  return parts.join(':');
}

function escapeFilterArgument(arg: string, quote?: boolean): string {
  if (quote) {
    const quoteParts = arg.split("'");
    return quoteParts
      .filter((e) => e !== '')
      .map((e) => `'${e}'`)
      .join("\\'");
  }
  return arg.replace(/[\\'[\],;]/g, '\\$&');
}

class Filter {
  name: string;
  arguments: string | null = null;

  constructor(name: string, args: FilterArgument[]) {
    this.name = name;
    if (args.length > 0) {
      this.arguments = parseFilterArguments(args);
    }
  }

  toString() {
    if (this.arguments !== null) {
      return `${this.name}=${escapeFilterArgument(this.arguments, true)}`;
    }
    return this.name;
  }
}

const FilterProxy = new Proxy<Record<string, FilterFunction>>({}, {
  ownKeys() {
    return [];
  },
  get(target, filterName) {
    if (filterName in target) {
      return target[filterName as string];
    }
    const filterFunction = (...args: FilterArgument[]) => {
      return new Filter(filterName as string, args);
    };
    target[filterName as string] = filterFunction;
    return filterFunction;
  },
});
const NullFilterMap: Partial<Record<PipeMediaType, Filter>> = {
  video: FilterProxy.null(),
  audio: FilterProxy.anull()
};

class ChainNodeImpl implements ChainNode {
  helper: FilterComplexHelper;
  source: Pipe[];
  /**
   * 不存在过滤器时视为空节点。大部分操作在有无过滤器时不一致。
   */
  filter: Filter | null;
  destination: Pipe[];
  prev: ChainNodeImpl | null;
  next: ChainNodeImpl | null;

  constructor(helper: FilterComplexHelper, source: Pipe[], filter?: Filter) {
    this.helper = helper;
    this.source = source;
    this.filter = filter ?? null;
    this.destination = [];
    this.prev = null;
    this.next = null;
  }

  pipe(filterOrFunc: Filter | FilterFunction) {
    if (this.next) {
      throw new Error(`This chain has been linked to another filter, please fork it first`);
    }
    const filter = typeof filterOrFunc === 'function' ? filterOrFunc() : filterOrFunc;
    if (!this.filter) {
      this.filter = filter;
      return this;
    }
    const next = new ChainNodeImpl(this.helper, [], filter);
    this.next = next;
    next.prev = this;
    return next;
  }

  fork(connectedPipeCount: number) {
    if (!this.filter) {
      const src = this.source;
      if (src.length < connectedPipeCount) {
        throw new Error(`No enough pipe to fork as input`);
      }
      const fork = new ChainNodeImpl(this.helper, src.slice(0, connectedPipeCount));
      return fork;
    }
    const dest = this.destination;
    if (dest.length < connectedPipeCount) {
      for (let i = dest.length; i <= connectedPipeCount; i++) {
        dest.push(this.helper.createPipe());
      }
    }
    const fork = new ChainNodeImpl(this.helper, dest.slice(0, connectedPipeCount));
    return fork;
  }

  connect(...pipes: Pipe[]) {
    if (!this.filter) {
      throw new Error(`Cannot connect empty chain to output`);
    }
    const dest = this.destination;
    if (dest.length > 0) {
      throw new Error(`This chain has already connected to output`);
    }
    for (const pipe of pipes) {
      pipe.setBoundInput();
      dest.push(pipe);
    }
    return this;
  }

  link(node: ChainNodeImpl): ChainNode {
    if (this.next) {
      throw new Error(`This chain has already connected to output`);
    }
    if (!this.filter) {
      throw new Error(`Cannot connect empty chain to other chain`);
    }
    this.helper.linkNode(this, node);
    return node;
  }

  *[Symbol.iterator]() {
    if (!this.filter) {
      for (const pipe of this.source) {
        yield pipe;
      }
      return;
    }
    const dest = this.destination;
    for (const pipe of dest) {
      yield pipe;
    }
    while (dest.length < 64) {
      const pipe = this.helper.createPipe();
      pipe.setBoundInput();
      dest.push(pipe);
      yield pipe;
    }
    throw new Error(`Too many output pipes`);
  }

  toString() {
    if (this.filter) {
      return `${this.source.join('')}${this.filter}${this.destination.join('')}`;
    }
    return '';
  }
}

class FilterComplexHelper {
  anonymousPipeCounter = 0;
  chains: ChainNodeImpl[] = [];
  
  createPipe(name?: string) {
    if (name) {
      return new Pipe(name, true);
    }
    return new Pipe(`_${++this.anonymousPipeCounter}`);
  }

  createChain(source: Pipe[]) {
    const chain = new ChainNodeImpl(this, source);
    this.addChain(chain);
    return chain;
  }

  addChain(chain: ChainNodeImpl) {
    this.chains.push(chain);
  }

  linkNode(from: ChainNodeImpl, to: ChainNodeImpl) {
    const toChain = this.iterateChainNode(to);
    if (toChain.includes(from)) {
      throw new Error(`Loop chain`);
    }
    from.next = toChain[0];
    toChain[0].prev = from;
    const toChainIndex = this.chains.indexOf(toChain[0]);
    if (toChainIndex > 0) {
      this.chains.splice(toChainIndex, 1);
    }
  }

  getContext(): FilterComplexContext {
    return {
      from: (...source: Pipe[]) => this.createChain(source),
      pipe: (name?: string) => this.createPipe(name),
      input: InputProxy,
      filter: FilterProxy,
      fileArgument: FileArgumentFactory
    };
  }

  iterateChainNode(chain: ChainNodeImpl) {
    const nodes: ChainNodeImpl[] = [];
    let cursor: ChainNodeImpl | null = chain;
    while (cursor && !nodes.includes(cursor)) {
      nodes.push(cursor);
      cursor = cursor.next;
    }
    cursor = chain.prev;
    while (cursor && !nodes.includes(cursor)) {
      nodes.unshift(cursor);
      cursor = cursor.prev;
    }
    return nodes;
  }

  toString(exports?: Record<string, Pipe>) {
    if (exports) {
      for (const [newName, pipe] of Object.entries(exports)) {
        if (pipe.fixed) {
          const nullFilter: Filter | undefined = NullFilterMap[pipe.mediaType];
          if (nullFilter === undefined) {
            throw new Error(`Cannot decide pipe media type for ${newName}, please use pipe.mark() or use pipe.toString()`);
          }
          const redirectedChain = this.createChain([pipe]);
          const [redirectedPipe] = redirectedChain.pipe(nullFilter);
          redirectedPipe.as(newName);
        } else {
          pipe.as(newName);
        }
      }
    }
    return this.chains.map((chain) => this.iterateChainNode(chain).join(',')).join(';');
  }
}

export function filterComplex(f: (c: FilterComplexContext) => void | Record<string, Pipe>): string;
export function filterComplex(f: (c: FilterComplexContext) => Promise<void | Record<string, Pipe>>): Promise<string>;
export function filterComplex(f: (c: FilterComplexContext) => void | Record<string, Pipe> | Promise<void | Record<string, Pipe>>) {
  const helper = new FilterComplexHelper();
  const c = helper.getContext();
  const result = f(c);
  if (result?.then && !(result.then instanceof Pipe)) {
    return result.then((r) => helper.toString(r as (undefined | Record<string, Pipe>)));
  }
  return helper.toString(result as (undefined | Record<string, Pipe>));
}

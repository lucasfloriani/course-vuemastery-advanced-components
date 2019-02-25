# Advanced Components

Neste curso focará em decifrar o **component template render cycle** (imagem abaixo) e reactividade.

![component template render cycle](img/component-template render-cycle.png)

Contruir seu próprio mecanismo de reatividade

## Build a Reactivity System

Uma aplicação simples em Vue:

```js
var vm = new Vue({
  el: "#app",
  data: {
    price: 5.0,
    quantity: 2
  },
  computed: {
    totalPriceWithTax() {
      return this.price * this.quantity * 1.03;
    }
  }
});
```

```html
<div id="app">
  <div>Price: ${{ price }}</div>
  <div>Total: ${{ price * quantity }}</div>
  <div>Taxes: ${{ totalPriceWithTax }}</div>
</div>
```

Esta reactividade não é geralmente como o Javascript trabalha!!

```js
let price = 5;
let quantity = 2;
let total = price * quantity;

console.log(`total is ${total}`);

price = 20;

console.log(`total is ${total}`);
```

Como no exemplo, mesmo que trocassemos o valor da variavel price, o valor que foi adicionado na variavel total não sera alterado

Como iremos salvar o **total** calculado, para que quando nos rodarmos ele novamente quando o **price** e **quantity** atualize?

Exemplo simples de reatividade:

```js
let price = 5;
let quantity = 2;
let total = 0;
let target = null;
// Para armazenar código
let storage = []

// Salvar ele no storage para ser chamada futuramente
target = () { total = price * quantity };

// Adicionando o código para a storage de variáveis
const record = () => { storage.push(target) }
// Executa os códigos salvos na storage
const replay = () => { storage.forEach(run => run())}

// Por exemplo
console.log(total) // 10
price = 20
console.log(total) // 10
replay()
console.log(total) // 40
```

Como podemos criar uma solução mais escalável utilizando uma classe para armazenar nossas dependências?
Utilizando o **padrão de projeto observer**

```js
// Dep de Dependência
class Dep {
  constructor() {
    // Variavel da storage
    this.subscribers = [];
  }

  // Se o target existe e se já foi adicionado
  depend() {
    if (target && !this.subscribers.includes(target)) {
      this.subscribers.push(target);
    }
  }

  notify() {
    this.subscribers.forEach(sub => sub());
  }
}
```

OBS: **Vue tambem tem uma classe Dep, o qual tambem imita tal funcionamento**

Exemplo de utilização

```js
// Dep de Dependência
class Dep {
  constructor() {
    // Variavel da storage
    this.subscribers = [];
  }

  // Se o target existe e se já foi adicionado
  depend() {
    if (target && !this.subscribers.includes(target)) {
      this.subscribers.push(target);
    }
  }

  notify() {
    this.subscribers.forEach(sub => sub());
  }
}

const dep = new Dep();

let price = 5;
let quantity = 2;
let total = 0;

let target = () => {
  total = price * quantity;
};
dep.depend();
target();
```

Em algum momento vamos precisar ter uma instancia Dep para cada variável. Como podemos encapsular o código que precisa ser escutado/gravado?

```js
// Mesmo código de antes
let target = () => {
  total = price * quantity;
};
dep.depend();
target();
```

Em vez disso nós queremos escrever assim

```js
watcher(() => {
  total = price * quantity;
});
```

Nossa nova função watcher

```js
function watcher(myFunc) {
  target = myFunc;
  dep.depend();
  target();
  target = null;
}
```

Agora nós precisamos um modo de identificar quais propriedades são acessadas dentro de cada watcher, para descobrir em qual instância do dep sera chamada.

```js
// price foi chamado => chame dep.depend() no price
// quantity foi chamado => chame dep.depend() no quantity
watcher(() => {
  total = data.price * data.quantity;
});
```

```js
// price foi chamado => chame dep.depend() no price
watcher(() => {
  total = data.price * 0.9;
});
```

Precisamos tambem identificar quando uma propriedade for atualizada (ou setada), nós podemos ativar dep.notify() para ser chamada em sua classe Dep.

Com isto a funcionalidade **Object.defineProperty()** entra em ação.

**Object.defineProperty()** nos possibilita definir funções getters e setters em uma propriedade

```js
let data = { price: 5, quantity: 2 };

// Para somente a propriedade price do objeto data
Object.defineProperty(data, "price", {
  get() {
    console.log(`I was accessed`);
  },
  set(newVal) {
    console.log(`I was changed`);
  }
});

data.price; // Chama o get
data.price = 20; // Chama o set(20)

// Aparece no console:
// I was accessed
// I was changed
```

```js
let data = { price: 5, quantity: 2 };
let internalValue = data.price;

Object.defineProperty(data, "price", {
  get() {
    console.log(`Getting price: ${internalValue}`);
    return internalValue;
  },
  set(newVal) {
    console.log(`Setting price to: ${newVal}`);
    internalValue = newVal;
  }
});

data.price;
data.price = 20;

// Aparece no console:
// Getting price: 5
// Setting price to: 20
```

```js
let data = { price: 5, quantity: 2 };
Object.keys(data).forEach(key => {
  let internalValue = data[key];
  Object.defineProperty(data, key, {
    get() {
      console.log(`Getting ${key}: ${internalValue}`);
      return internalValue;
    },
    set(newVal) {
      console.log(`Setting ${key} to: ${newVal}`);
      internalValue = newVal;
    }
  });
});

total = data.price * data.quantity;

data.price = 20;

// Aparece no console:
// Getting price: 5
// Getting quantity: 2
// Setting price to: 20
```

### Combinando idéias

Lembre-se como nos precisamos rodar as funcionalidade do dep no momento certo?

Juntando os peçados agora:

```js
let data = { price: 5, quantity: 2 };
Object.keys(data).forEach(key => {
  let internalValue = data[key];
  const dep = new Dep();
  Object.defineProperty(data, key, {
    get() {
      dep.depend();
      return intervalValue;
    },
    set(newVal) {
      intervalValue = newVal;
      dep.notify();
    }
  });
});

total = data.price * data.quantity;

data.price = 20;

// Aparece no console:
// Getting price: 5
// Getting quantity: 2
// Setting price to: 20
```

## Exemplificando a imagem

![component template render cycle](img/component-template render-cycle.png)

### Data

Utiliza **Object.defineProperty()** para setar "middlewares" ao setar e pegar as propriedades do objeto.
Quando executa o **get**, acaba chamado **dep.depend()**, que registra a função que esta pegando o valor da propriedade para que quando esse valor mude, ele altere o valor dessa função.
Quando é alterado o valor (**set**), é chamado **dep.notify()**, onde executa as funções registradas no dep desta propriedade, informando assim os lugares que a usam desta mudança.

### Watcher

Recebe uma função que utiliza o data, adicionando temporáriamente essa função em uma variavel que é chamada para registrar nos deps das propriedades utilizadas.

## Proxies

Na versão **Vue 2.x-next**, a **Reatividade do Vue será reescrita com Proxies**

Será usado pois **Object.defineProperty** altera o objeto passado

```js
// target = source data
var p = new Proxy(target, handler);
```

## Reatividade no código do Vue.js

```html
<!-- index.html -->
<div id="app">
  <h1>{{ product }}</h1>
</div>

<script src="vue.js"></script>

<script>
  var app = new Vue({
    el: "#app",
    data: {
      product: "Socks"
    }
  });
</script>
```

Onde no código fonte o product ganha sua reatividade?

```js
// /src/core/instance/index.js
import { initMixin } from "./init";  // Vamos entrar aqui
import { stateMixin } from "./state";
import { renderMixin } from "./render";
import { eventsMixin } from "./events";
import { lifecycleMixin } from "./lifecycle";
import { warn } from "../util/index";

function Vue (options) {
  ... // omitted code
  this._init(options)
}
```

```js
// /src/core/instance/init.js
export function initMixin (Vue : Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this

    ... Normalizing options ...
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHooks(vm, 'beforeCreate')
    initInjections(vm)
    initState(vm) // Vamos entrar aqui
    initProvide(vm)
    callHook(vm, 'created')
    ...
    vm.$mount(vm.$options.el)
  }
}
```

```js
// /src/core/instance/state.js
export function initState(vm: Component) {
  vm._watchers = [];
  const opts = vm.$options;
  if (opts.props) initProps(vm, opts.props);
  if (opts.methods) initMethods(vm, opts.methods);
  if (opts.data) {
    initData(vm); // Vamos entrar aqui
  } else {
    observe((vm._data = {}), true /* asRootData */);
  }
  if (opts.computed) initComputed(vm, opts.computed);
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch);
  }
}
```

```js
// /src/core/instance/state.js
function initData (vm: Component) {
  // data = { product: 'Socks' }
  let data = vm.$options.data
  ...
  observe(data, true /* asRootData */) // Vamos entrar aqui
}
```

```js
// /src/core/observer/index.js
export function observe (value: any, asRootData: ?boolean): Observer | void {
  ...
  ob = new Observer(value) // { product: 'Socks' }
  return ob
}
```

```js
// /src/core/observer/index.js
export class Observer {
  value: any

  constructor(value: any)  {
    this.value = value
    ...
    if (Array.isArray(value)) {
      ...
      this.observerArray(value)
      /*
        Método passa por cada item do array
        observeArray(items: Array<any>) {
          for (let i = 0, l = items.length; i < l; i++ {
            observe(items[i])
          })
        }
      */
    } else {
      this.walk(value)
      /*
        walk(obj: Object) {
          const key = Object.keys(obj) // [ 'product' ]

          for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]])
          }
        }
      */
    }
  }
}
```

```js
// /src/core/observer/index.js
export function defineReactive(
  obj: Object, // { product: 'Socks' }
  key: string, // 'product'
  val: any, // 'Socks' (val é nosso internalValue)
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep();

  const property = Object.getOwnPropertyDescriptor(obj, key);
  // Se a propriedade não for configurável, então retorne
  if (property && property.configurable === false) {
    return;
  }
  // cater for pre-defined getters/setters
  const getter = property && property.get;
  const setter = property && property.set;

  // Aqui é onde nós ciramos os getters e setters
  Object.defineProperty(obj, key {
    enumerable: true,
    configurable: true,
    // Nossa função get para essa propriedade
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val

      if (Dep.target) {
        dep.depend()
        ...
      }
      return value // Getter retorna o valor
    },
    // Nossa função set para essa propriedade
    set: function reactiveSetter (newVal) {
      // Pega valor através de um getter customizado ou valor
      const value = getter ? getter.call(obj) : val

      // Se o newVal for o mesmo valor então retorna
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }

      // Chama o setter custom, se não seta o novo valor
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }

      dep.notify()
    } ...
  })
}
```

Lembra da nossa Watch function?

```js
function watcher(myFunc) {
  target = myFunc;
  target();
  target = null;
}

watcher(() => {
  total = price * quantity;
});
```

Vue tem uma Watcher class na qual:

- Recebe como parâmetro o código para observar (igual o nosso)
- Armazena o código dentro de uma propriedade **getter**
- Tem uma function **get** (chamada diretamente na instanciação, ou pelo scheduler) o qual:
  - Roda **pushTarget(this)** para setar **Dep.target** para este objeto Watcher
  - Chama **this.getter.call** para rodar o código
  - Roda **popTarget()** para remover o atual **Dep.target**
- Tem uma função **update** para enfileirar este **watcher** para rodar (usando um scheduler)

```js
// /src/code/observer/watcher.js
export default class Watcher {
  ...
  // Chamado pelo construtor
  get() {
    pushTarget(this)
    ...
    value = this.getter.call(vm, vm)
    ...
    popTarget()
    return value
  }

  // Chamado pela classe Dep notify()
  update() {
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
      /*
        // Checa para ver se tiver ativo, se tiver
        // ele roda o this
        run() {
          if (this.active) {
            const value = this.get() // get de cima
            // ...
          }
        }
      */
    } else {
      // Quando está pronto tambem chama run()
      queueWatcher(this)
    }
  }

  addDep(dep: Dep) {
    ...
    // Watcher tambem mantem a localização dos deps
    this.newDeps.push(dep)
    dep.addSub(this) // da Classe Dep
  }
}
```

```js
// /src/core/observer/dep.js
export default class Dep {
  ...
  subs: Array<Watcher>
  // Nosso subscribers são todos da classe Watcher
  constructor() {
    this.subs = []
  }

  addSub(sub: Watcher) {
    this.subs.push(sub)
  }

  depend() {
    // Se tiver target, adiciona essa dependencia
    if (Dep.target) {
      Dep.target.addDep(this) // da Classe Watcher
    }
  }

  notify() {
    const subs = this.subs.slice9)
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}
```

## Resalvas sobre a Reactividade

### Array Change Detection

Se você usa algum destes metodos de array abaixo não se preocupe, o Vue encapsula os métodos de mutação do array observados, de modo que todos esses acionam atualizações

```js
push();
pop();
shift();
unshift();
splice();
sort();
reverse();
```

Porem o Vue não pode detectar a seguintes mudanças

```js
app.items[indexOfItem] = newValue;
// A Solução seria:
Vue.set(app.items, indexOfItem, newValue);
```

```js
app.items.length = newLength;
// A Solução seria:
app.items.splice(indexOfItem, 1, newValue);
```

### Object Change Detection

Vue não pode detectar adição e remoção de propriedades

```js
var app = new Vue({
  el: "#app",
  data: {
    product: "Socks"
  }
});

app.color = "red";
```

Não é possível adicionar propriedades reativas no nivel root

A solução seria:

```js
// 1 - Nest your objects
var app = new Vue({
  el: "#app",
  data: {
    product: {
      name: "Socks"
    }
  }
});
// 2 - Usar 'set'
Vue.set(app.product, "color", "red");
```

Para multiplas propriedades pode-se utilizar:

```js
app.product = Object.assign({}, app.product, {
  color: "red",
  price: 20
});
```

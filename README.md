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

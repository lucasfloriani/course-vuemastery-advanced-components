let data = { price: 5, quantity: 2 };
let target, total, salePrice;

class Dep {
  constructor() {
    this.subscribers = [];
  }

  depend() {
    if (target && !this.subscribers.includes(target)) {
      this.subscribers.push(target);
    }
  }

  notify() {
    this.subscribers.forEach(sub => sub());
  }
}

let deps = new Map();

Object.keys(data).forEach(key => {
  deps.set(key, new Dep());
});

let data_without_proxy = data;

data = new Proxy(data_without_proxy, {
  get(obj, key) {
    deps.get(key).depend();
    return obj[key];
  },
  set(obj, key, newVal) {
    obj[key] = newVal;
    deps.get(key).notify();
    return true;
  }
});

function watcher(myFunc) {
  target = myFunc;
  target();
  target = null;
}

watcher(() => {
  total = data.price * data.quantity;
});

watcher(() => {
  salePrice = data.price * 0.9;
});

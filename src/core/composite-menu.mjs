// Compatibility entrypoint; composition is owned by the one canonical compiler.
import {compileMenuSpec} from './menu-spec.mjs';
import {validateProduct} from '../api/config.mjs';
export function compileComposite({product,inventory,generation,sink}={}) {
  const state=validateProduct(product);
  return compileMenuSpec({mode:'composite',configs:state.configs,product:state.product,defaultTarget:state.product.defaultTarget,inventory,generation,sink});
}

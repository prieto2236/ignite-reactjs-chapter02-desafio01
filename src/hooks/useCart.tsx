import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const produto = cart.find(product => product.id === productId);

      if (produto) {
        updateProductAmount({
          productId: produto.id,
          amount: produto.amount + 1
        })
      } else {
        //Busca estoque do produto
        const stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);

        if (stock.amount >= 1) {
          //Busca produto
          const novoProduto = await api.get<Product>(`/products/${productId}`).then(res => ({ ...res.data, amount: 1 }));

          //Atualiza carrinho
          setCart([...cart, novoProduto])

          //persiste carrinho
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, novoProduto]));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const produto = cart.find(product => product.id === productId);

      if (!produto) {
        throw new Error();
      }

      const novoCart = cart.filter((product) => product.id != productId)

      setCart(novoCart)

      //persiste carrinho
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(novoCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //Busca estoque do produto
      const stock = await api.get<Stock>(`/stock/${productId}`).then(res => res.data);

      if (amount === 0) {
        throw new Error();
      }

      if (stock.amount >= amount) {
        //Atualiza produto
        const novoCart = cart.map((product) => {
          if (product.id === productId) {
            product.amount = amount
          }

          return product
        })

        setCart(novoCart)

        //persiste carrinho
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(novoCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, ShoppingCart, LogOut, Plus, Edit, Trash2, 
  Eye, DollarSign, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import heroBanner from '@/assets/hero-bellavia.jpg';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  sizes: string[];
  colors: string[];
  stock: number;
  active: boolean;
  ironpay_product_hash?: string | null;
  ironpay_offer_hash?: string | null;
  ironpay_last_sync_at?: string | null;
  ironpay_last_sync_status?: string | null;
  ironpay_last_sync_error?: string | null;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  items: any[];
  total: number;
  status: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'outros',
    image_url: '',
    sizes: 'P,M,G,GG',
    colors: '',
    stock: '10',
  });

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, isLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchProducts();
      fetchOrders();
    }
  }, [user, isAdmin]);

  const fetchProducts = async () => {
    // Admin can see all products (including inactive ones)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar produtos');
      return;
    }
    if (data) setProducts(data);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast.error('Erro ao carregar pedidos');
      return;
    }
    if (data) setOrders(data.map(o => ({ ...o, items: o.items as any[] })));
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const syncProductToIronPay = async (product: any, action: 'create' | 'update' | 'delete') => {
    try {
      const { data: result, error } = await supabase.functions.invoke('ironpay-sync', {
        body: {
          action: action === 'delete' ? 'delete_product' : action === 'create' ? 'create_product' : 'update_product',
          product,
        },
      });
      
      if (error) {
        console.error('IronPay sync error:', error);
        return { success: false, error: error.message };
      }
      
      return result;
    } catch (err: any) {
      console.error('IronPay sync exception:', err);
      return { success: false, error: err.message };
    }
  };

  const persistIronPaySyncResult = async (
    productId: string,
    syncResult: any
  ) => {
    const now = new Date().toISOString();

    const updatePayload: any = {
      ironpay_last_sync_at: now,
    };

    if (syncResult?.success) {
      updatePayload.ironpay_last_sync_status = 'success';
      updatePayload.ironpay_last_sync_error = null;

      if (syncResult.ironpay_product_hash) updatePayload.ironpay_product_hash = syncResult.ironpay_product_hash;
      if (syncResult.ironpay_offer_hash) updatePayload.ironpay_offer_hash = syncResult.ironpay_offer_hash;
    } else {
      updatePayload.ironpay_last_sync_status = 'error';
      updatePayload.ironpay_last_sync_error = syncResult?.error || 'Erro ao sincronizar com IronPay';
    }

    await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', productId);
  };

  const handleResyncProduct = async (product: Product) => {
    toast.info('Sincronizando com IronPay...');

    const syncResult = await syncProductToIronPay(product, 'update');
    await persistIronPaySyncResult(product.id, syncResult);

    if (syncResult?.success) {
      toast.success('Produto sincronizado com IronPay!');
    } else {
      toast.warning('Falha ao sincronizar com IronPay: ' + (syncResult?.error || 'erro'));
    }

    fetchProducts();
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: productForm.name,
      description: productForm.description || null,
      price: parseFloat(productForm.price),
      category: 'outros' as const,
      image_url: productForm.image_url || null,
      sizes: productForm.sizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: productForm.colors.split(',').map(c => c.trim()).filter(Boolean),
      stock: parseInt(productForm.stock),
      active: true,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
        
        // Sync update to IronPay
        toast.info('Sincronizando com IronPay...');
        const syncResult = await syncProductToIronPay({ ...productData, id: editingProduct.id }, 'update');
        await persistIronPaySyncResult(editingProduct.id, syncResult);
        if (syncResult?.success) {
          toast.success('Produto atualizado e sincronizado!');
        } else {
          toast.warning('Produto atualizado localmente. IronPay: ' + (syncResult?.error || 'erro'));
        }
      } else {
        // First create in local database
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        
        // Then sync to IronPay
        toast.info('Sincronizando com IronPay...');
        const syncResult = await syncProductToIronPay({ ...productData, id: newProduct.id }, 'create');
        await persistIronPaySyncResult(newProduct.id, syncResult);
        if (syncResult?.success) {
          toast.success('Produto criado e sincronizado com IronPay!');
        } else {
          toast.warning('Produto criado localmente. IronPay: ' + (syncResult?.error || 'erro'));
        }
      }
      
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar produto');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      category: 'outros',
      image_url: '',
      sizes: 'P,M,G,GG',
      colors: '',
      stock: '10',
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      image_url: product.image_url || '',
      sizes: product.sizes?.join(',') || '',
      colors: product.colors?.join(',') || '',
      stock: product.stock.toString(),
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const productToDelete = products.find(p => p.id === id);
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir produto');
      return;
    }
    
    // Sync deletion to IronPay
    if (productToDelete) {
      toast.info('Sincronizando exclusão com IronPay...');
      const syncResult = await syncProductToIronPay(productToDelete, 'delete');
      if (syncResult?.success) {
        toast.success('Produto excluído e sincronizado!');
      } else {
        toast.success('Produto excluído localmente.');
      }
    } else {
      toast.success('Produto excluído!');
    }
    
    fetchProducts();
  };

  const handleToggleProductActive = async (product: Product) => {
    const { error } = await supabase
      .from('products')
      .update({ active: !product.active })
      .eq('id', product.id);
    
    if (error) {
      toast.error('Erro ao atualizar produto');
    } else {
      fetchProducts();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const updateData: any = { status };
    if (status === 'paid') {
      updateData.payment_confirmed_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);
    
    if (error) {
      toast.error('Erro ao atualizar pedido');
    } else {
      toast.success('Pedido atualizado!');
      fetchOrders();
    }
  };

  const totalRevenue = orders
    .filter(o => o.status === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link to="/" className="font-display text-xl font-bold bellavia-text-gradient">
            Bellavia Admin
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl p-6 bellavia-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bellavia-gradient flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold text-foreground">{products.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 bellavia-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-amber-500 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pedidos Pendentes</p>
                <p className="text-2xl font-bold text-foreground">{pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 bellavia-card">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {totalRevenue.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold text-foreground">Produtos</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
                setIsProductDialogOpen(open);
                if (!open) {
                  setEditingProduct(null);
                  resetProductForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="bellavia-gradient gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div>
                      <Label>Nome *</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Preço *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label>Estoque *</Label>
                        <Input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select
                        value={productForm.category}
                        onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="outros">Calças</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>URL da Imagem</Label>
                      <Input
                        value={productForm.image_url}
                        onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label>Tamanhos (separados por vírgula)</Label>
                      <Input
                        value={productForm.sizes}
                        onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })}
                        placeholder="P, M, G, GG"
                      />
                    </div>
                    <div>
                      <Label>Cores (separadas por vírgula)</Label>
                      <Input
                        value={productForm.colors}
                        onChange={(e) => setProductForm({ ...productForm, colors: e.target.value })}
                        placeholder="Branco, Preto, Azul"
                      />
                    </div>
                    <Button type="submit" className="w-full bellavia-gradient">
                      {editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-4 p-4 bg-card rounded-xl bellavia-card ${
                    !product.active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="h-16 w-16 rounded-lg overflow-hidden bg-secondary/30 flex-shrink-0">
                    <img
                      src={product.image_url || heroBanner}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Calças • Estoque: {product.stock}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IronPay: {product.ironpay_offer_hash ? 'Sincronizado' : 'Não sincronizado'}
                    </p>
                    <p className="text-primary font-semibold">
                      R$ {product.price.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResyncProduct(product)}
                      title="Sincronizar com IronPay"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleProductActive(product)}
                    >
                      {product.active ? (
                        <Eye className="h-4 w-4 text-primary" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum produto cadastrado ainda.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">Pedidos</h2>

            <div className="grid gap-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-card rounded-xl p-6 bellavia-card"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="font-medium text-foreground">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        R$ {order.total.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground mb-4">
                    <p><strong>Endereço:</strong> {order.customer_address}</p>
                    <p className="mt-2"><strong>Itens:</strong></p>
                    <ul className="list-disc list-inside">
                      {order.items.map((item, i) => (
                        <li key={i}>
                          {item.name} - {item.size}/{item.color} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      order.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status === 'pending' ? 'Aguardando' :
                       order.status === 'paid' ? 'Pago' :
                       order.status === 'shipped' ? 'Enviado' :
                       order.status === 'delivered' ? 'Entregue' :
                       'Cancelado'}
                    </span>
                    
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'paid')}
                          className="bg-emerald-500 hover:bg-emerald-600"
                        >
                          Confirmar Pagamento
                        </Button>
                      )}
                      {order.status === 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'shipped')}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Marcar Enviado
                        </Button>
                      )}
                      {order.status === 'shipped' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Marcar Entregue
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {orders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum pedido ainda.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;

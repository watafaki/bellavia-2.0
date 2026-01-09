import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ArrowLeft, CreditCard, QrCode, Barcode, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Marquee from '@/components/Marquee';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/lib/store';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema for checkout form
const checkoutSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
  phone: z.string().min(8, 'Telefone inválido').max(20, 'Telefone muito longo'),
  document: z.string().min(11, 'CPF inválido').max(18, 'Documento inválido'),
  street_name: z.string().min(3, 'Rua muito curta').max(200, 'Rua muito longa'),
  number: z.string().min(1, 'Número obrigatório').max(10, 'Número inválido'),
  complement: z.string().max(100, 'Complemento muito longo').optional(),
  neighborhood: z.string().min(2, 'Bairro muito curto').max(100, 'Bairro muito longo'),
  city: z.string().min(2, 'Cidade muito curta').max(100, 'Cidade muito longa'),
  state: z.string().length(2, 'Use a sigla do estado (ex: SP)'),
  zip_code: z.string().min(8, 'CEP inválido').max(10, 'CEP inválido'),
});

type PaymentMethod = 'pix' | 'credit_card' | 'billet';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart } = useCart();
  const [step, setStep] = useState<'form' | 'payment' | 'result'>('form');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionData, setTransactionData] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    street_name: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
  });

  const [cardData, setCardData] = useState({
    number: '',
    holder_name: '',
    exp_month: '',
    exp_year: '',
    cvv: '',
  });

  const [installments, setInstallments] = useState(1);

  const total = getTotal();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardData({ ...cardData, [e.target.name]: e.target.value });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = checkoutSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }
    
    setStep('payment');
  };

  const copyPixCode = async () => {
    const pixCode = transactionData?.data?.pix?.pix_qr_code || transactionData?.data?.pix_code;
    if (pixCode) {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleProcessPayment = async () => {
    setSubmitting(true);
    
    try {
      // Build cart for IronPay
      const cartItems = items.map(item => ({
        id: item.id,
        product_hash: item.ironpay_product_hash || undefined,
        offer_hash: item.ironpay_offer_hash || undefined,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        image_url: item.image_url,
      }));

      const payload: any = {
        action: 'create_transaction',
        cart: cartItems,
        customer: formData,
        payment_method: paymentMethod,
        offer_hash: items[0]?.ironpay_offer_hash || undefined,
      };

      // Add card data for credit card
      if (paymentMethod === 'credit_card') {
        if (!cardData.number || !cardData.holder_name || !cardData.exp_month || !cardData.exp_year || !cardData.cvv) {
          toast.error('Preencha todos os dados do cartão');
          setSubmitting(false);
          return;
        }
        payload.card = cardData;
        payload.installments = installments;
      }

      console.log('Processing payment:', payload);

      const { data, error } = await supabase.functions.invoke('ironpay-transaction', {
        body: payload
      });

      if (error) throw error;

      console.log('Transaction response:', data);

      // IronPay returns transaction data directly or with success wrapper
      const transactionResult = data.success !== undefined ? data : { success: true, data };
      
      // Check if transaction was created (has hash or payment_status)
      const txData = transactionResult.data || data;
      if (txData.hash || txData.payment_status || transactionResult.success) {
        setTransactionData({ data: txData, success: true });
        
        if (paymentMethod === 'credit_card' && txData.payment_status === 'paid') {
          // Credit card was approved immediately
          clearCart();
          toast.success('Pagamento aprovado com sucesso!');
          navigate('/');
        } else {
          // PIX or Boleto - show payment info
          setStep('result');
          toast.success('Pedido criado! Complete o pagamento.');
        }
      } else {
        throw new Error(data.error || txData.message || 'Erro ao processar pagamento');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayment = () => {
    clearCart();
    toast.success('Obrigado! Seu pedido foi registrado.');
    navigate('/');
  };

  if (items.length === 0) {
    navigate('/carrinho');
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Marquee />
      <Header />
      <main className="flex-1 pt-32">
        <div className="container py-8 max-w-2xl">
          {step === 'form' && (
            <>
              <h1 className="font-display text-3xl font-bold text-foreground mb-8">
                Finalizar <span className="bellavia-text-gradient">Compra</span>
              </h1>

              <form onSubmit={handleSubmitForm} className="space-y-6">
                <div className="bg-card rounded-xl p-6 bellavia-card space-y-4">
                  <h2 className="font-semibold text-foreground">Dados Pessoais</h2>
                  
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Seu nome completo"
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="seu@email.com"
                        required
                        maxLength={255}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="(99) 99999-9999"
                        required
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="document">CPF *</Label>
                    <Input
                      id="document"
                      name="document"
                      value={formData.document}
                      onChange={handleInputChange}
                      placeholder="000.000.000-00"
                      required
                      maxLength={18}
                    />
                  </div>
                </div>

                <div className="bg-card rounded-xl p-6 bellavia-card space-y-4">
                  <h2 className="font-semibold text-foreground">Endereço de Entrega</h2>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="street_name">Rua *</Label>
                      <Input
                        id="street_name"
                        name="street_name"
                        value={formData.street_name}
                        onChange={handleInputChange}
                        placeholder="Nome da rua"
                        required
                        maxLength={200}
                      />
                    </div>
                    <div>
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        name="number"
                        value={formData.number}
                        onChange={handleInputChange}
                        placeholder="123"
                        required
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        name="complement"
                        value={formData.complement}
                        onChange={handleInputChange}
                        placeholder="Apt, Bloco..."
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        name="neighborhood"
                        value={formData.neighborhood}
                        onChange={handleInputChange}
                        placeholder="Seu bairro"
                        required
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-1">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Cidade"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">UF *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="SP"
                        required
                        maxLength={2}
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip_code">CEP *</Label>
                      <Input
                        id="zip_code"
                        name="zip_code"
                        value={formData.zip_code}
                        onChange={handleInputChange}
                        placeholder="00000-000"
                        required
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl p-6 bellavia-card">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total a Pagar</span>
                    <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <Button type="submit" className="w-full bellavia-gradient" size="lg">
                  Escolher Forma de Pagamento
                </Button>
              </form>
            </>
          )}

          {step === 'payment' && (
            <>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep('form')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <h1 className="font-display text-3xl font-bold text-foreground mb-8">
                Forma de <span className="bellavia-text-gradient">Pagamento</span>
              </h1>

              <div className="space-y-6">
                {/* Payment Method Selection */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'pix'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <QrCode className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">PIX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('credit_card')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'credit_card'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <CreditCard className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">Cartão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('billet')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'billet'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Barcode className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <span className="text-sm font-medium">Boleto</span>
                  </button>
                </div>

                {/* Credit Card Form */}
                {paymentMethod === 'credit_card' && (
                  <div className="bg-card rounded-xl p-6 bellavia-card space-y-4">
                    <h3 className="font-semibold text-foreground">Dados do Cartão</h3>
                    
                    <div>
                      <Label htmlFor="card_number">Número do Cartão</Label>
                      <Input
                        id="card_number"
                        name="number"
                        value={cardData.number}
                        onChange={handleCardChange}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                      />
                    </div>

                    <div>
                      <Label htmlFor="holder_name">Nome no Cartão</Label>
                      <Input
                        id="holder_name"
                        name="holder_name"
                        value={cardData.holder_name}
                        onChange={handleCardChange}
                        placeholder="Como está no cartão"
                        className="uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="exp_month">Mês</Label>
                        <Input
                          id="exp_month"
                          name="exp_month"
                          value={cardData.exp_month}
                          onChange={handleCardChange}
                          placeholder="12"
                          maxLength={2}
                        />
                      </div>
                      <div>
                        <Label htmlFor="exp_year">Ano</Label>
                        <Input
                          id="exp_year"
                          name="exp_year"
                          value={cardData.exp_year}
                          onChange={handleCardChange}
                          placeholder="2025"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          name="cvv"
                          value={cardData.cvv}
                          onChange={handleCardChange}
                          placeholder="123"
                          maxLength={4}
                          type="password"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Parcelas</Label>
                      <Select value={String(installments)} onValueChange={(v) => setInstallments(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x de R$ {(total / n).toFixed(2).replace('.', ',')}
                              {n === 1 ? ' à vista' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div className="bg-card rounded-xl p-6 bellavia-card">
                  <h3 className="font-semibold text-foreground mb-4">Resumo do Pedido</h3>
                  <div className="space-y-2 text-sm">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-muted-foreground">
                        <span>{item.quantity}x {item.name}</span>
                        <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border mt-4 pt-4 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <Button
                  className="w-full bellavia-gradient gap-2"
                  size="lg"
                  onClick={handleProcessPayment}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Pagar com ${paymentMethod === 'pix' ? 'PIX' : paymentMethod === 'credit_card' ? 'Cartão' : 'Boleto'}`
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 'result' && transactionData && (
            <>
              <Button
                variant="ghost"
                className="mb-4"
                onClick={() => setStep('payment')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>

              <h1 className="font-display text-3xl font-bold text-foreground mb-8">
                {paymentMethod === 'pix' ? 'Pague com PIX' : 'Boleto Gerado'}
              </h1>

              <div className="bg-card rounded-xl p-8 bellavia-card text-center space-y-6">
                {paymentMethod === 'pix' && (transactionData.data?.pix?.pix_qr_code || transactionData.data?.qr_code) && (
                  <>
                    <p className="text-muted-foreground">
                      Escaneie o QR Code ou copie o código PIX
                    </p>

                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG
                          value={transactionData.data.pix?.pix_qr_code || transactionData.data.pix_code || ''}
                          size={200}
                          level="H"
                          includeMargin
                        />
                      </div>
                    </div>

                    {(transactionData.data.pix?.pix_qr_code || transactionData.data.pix_code) && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Código PIX:</p>
                        <div className="bg-secondary/50 p-3 rounded-lg text-xs font-mono text-foreground break-all max-h-24 overflow-auto">
                          {transactionData.data.pix?.pix_qr_code || transactionData.data.pix_code}
                        </div>
                        <Button variant="outline" className="gap-2" onClick={copyPixCode}>
                          {copied ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copiar Código
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {paymentMethod === 'billet' && transactionData.data && (
                  <>
                    <p className="text-muted-foreground">
                      Seu boleto foi gerado com sucesso!
                    </p>

                    {transactionData.data.billet_barcode && (
                      <div className="bg-secondary/50 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Código de barras:</p>
                        <p className="font-mono text-sm text-foreground break-all">
                          {transactionData.data.billet_barcode}
                        </p>
                      </div>
                    )}

                    {transactionData.data.billet_url && (
                      <Button asChild className="gap-2">
                        <a href={transactionData.data.billet_url} target="_blank" rel="noopener noreferrer">
                          <Barcode className="h-4 w-4" />
                          Visualizar Boleto
                        </a>
                      </Button>
                    )}
                  </>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Valor:</p>
                  <p className="text-3xl font-bold text-primary">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </p>
                </div>

                {transactionData.data?.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Expira em: {new Date(transactionData.data.expires_at).toLocaleString('pt-BR')}
                  </p>
                )}

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">
                    Após efetuar o pagamento, seu pedido será processado automaticamente.
                  </p>
                  <Button
                    className="w-full bellavia-gradient"
                    size="lg"
                    onClick={handleConfirmPayment}
                  >
                    Concluir
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;

import { useState, useEffect } from 'react';
import { Sparkles, Upload, Loader2, ChevronLeft, ChevronRight, Ruler } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Marquee from '@/components/Marquee';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  sizes: string[];
  colors: string[];
}

const VirtualFitting = () => {
  const [userImage, setUserImage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [userHeight, setUserHeight] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('category', 'outros');
    
    if (error) {
      console.error('Error fetching products:', error);
      return;
    }
    
    setProducts(data || []);
    if (data && data.length > 0) {
      setSelectedProduct(data[0]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserImage(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTryOn = async () => {
    if (!userImage || !selectedProduct) {
      toast.error('Por favor, faça upload da sua foto e selecione uma roupa.');
      return;
    }

    setIsProcessing(true);
    setGeneratedImage(null);

    try {
      // Build clothing image URL - ensure it's a full URL
      let clothingImageUrl = selectedProduct.image_url;
      if (clothingImageUrl && !clothingImageUrl.startsWith('http')) {
        clothingImageUrl = `${window.location.origin}${clothingImageUrl.startsWith('/') ? '' : '/'}${clothingImageUrl}`;
      }

      const { data, error } = await supabase.functions.invoke('virtual-fitting', {
        body: {
          userImage,
          clothingImage: clothingImageUrl,
          clothingName: selectedProduct.name,
          selectedSize,
          userHeight: userHeight ? parseInt(userHeight) : null,
          userBodyDescription: userHeight ? `Pessoa com altura de ${userHeight}cm` : 'Pessoa da foto enviada'
        }
      });

      if (error) throw error;

      if (data.generatedImage) {
        setGeneratedImage(data.generatedImage);
        toast.success('Imagem gerada com sucesso!');
      } else {
        throw new Error(data.error || 'Erro ao gerar imagem');
      }
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao processar. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const nextProduct = () => {
    const newIndex = (currentProductIndex + 1) % products.length;
    setCurrentProductIndex(newIndex);
    setSelectedProduct(products[newIndex]);
    setGeneratedImage(null);
  };

  const prevProduct = () => {
    const newIndex = (currentProductIndex - 1 + products.length) % products.length;
    setCurrentProductIndex(newIndex);
    setSelectedProduct(products[newIndex]);
    setGeneratedImage(null);
  };

  const selectProduct = (product: Product, index: number) => {
    setSelectedProduct(product);
    setCurrentProductIndex(index);
    setGeneratedImage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Marquee />
      <Header />
      <main className="flex-1 pt-32">
        {/* Hero */}
        <section className="py-8 bg-gradient-to-br from-primary/5 to-accent">
          <div className="container text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-3">
              <Sparkles className="h-4 w-4" />
              Tecnologia de IA
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Teste em <span className="bellavia-text-gradient">Você</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Veja como nossas roupas ficam em você usando inteligência artificial!
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="container">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              
              {/* Upload Section */}
              <Card className="bellavia-card border-0">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    1. Sua Foto
                  </h2>
                  
                  <div 
                    className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                      userImage ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {userImage ? (
                      <div className="space-y-3">
                        <img
                          src={userImage}
                          alt="Sua foto"
                          className="max-h-48 mx-auto rounded-lg object-cover"
                        />
                        <Button variant="outline" size="sm" onClick={() => { setUserImage(null); setGeneratedImage(null); }}>
                          Trocar Foto
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer block py-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-foreground font-medium text-sm">
                          Clique para upload
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Foto de corpo inteiro
                        </p>
                      </label>
                    )}
                  </div>

                  {/* Height input */}
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center gap-2 text-sm">
                      <Ruler className="h-4 w-4" />
                      Sua altura (opcional)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="height"
                        type="number"
                        placeholder="170"
                        value={userHeight}
                        onChange={(e) => setUserHeight(e.target.value)}
                        className="w-24"
                        min="100"
                        max="250"
                      />
                      <span className="text-sm text-muted-foreground">cm</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ajuda a IA a simular melhor o tamanho
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card className="bellavia-card border-0">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    2. Escolha a Roupa
                  </h2>

                  {selectedProduct ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-y-0 left-0 flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-background/80 hover:bg-background ml-1"
                            onClick={prevProduct}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-background/80 hover:bg-background mr-1"
                            onClick={nextProduct}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="font-medium text-foreground text-sm">{selectedProduct.name}</p>
                        <p className="text-primary font-semibold">
                          R$ {selectedProduct.price.toFixed(2).replace('.', ',')}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tamanho</label>
                        <Select value={selectedSize} onValueChange={setSelectedSize}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(selectedProduct.sizes || ['P', 'M', 'G', 'GG']).map((size) => (
                              <SelectItem key={size} value={size}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          A IA ajusta o caimento baseado no tamanho
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Carregando produtos...</p>
                    </div>
                  )}

                  {/* Product thumbnails */}
                  {products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {products.slice(0, 6).map((product, index) => (
                        <button
                          key={product.id}
                          onClick={() => selectProduct(product, index)}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedProduct?.id === product.id ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Result Section */}
              <Card className="bellavia-card border-0">
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    3. Resultado
                  </h2>

                  <div className="relative border-2 border-dashed rounded-xl overflow-hidden min-h-[200px] flex items-center justify-center bg-secondary/30">
                    {isProcessing ? (
                      <div className="text-center p-6">
                        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Gerando sua imagem...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Isso pode levar alguns segundos
                        </p>
                      </div>
                    ) : generatedImage ? (
                      <img
                        src={generatedImage}
                        alt="Resultado"
                        className="w-full h-auto rounded-lg"
                      />
                    ) : (
                      <div className="text-center p-6">
                        <Sparkles className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          O resultado aparecerá aqui
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    size="lg"
                    onClick={handleTryOn}
                    disabled={!userImage || !selectedProduct || isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Testar em Mim
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tips */}
            <div className="mt-8 max-w-2xl mx-auto">
              <Card className="bellavia-card border-0 bg-secondary/30">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-3">Dicas para melhores resultados:</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Use uma foto de corpo inteiro com boa iluminação</li>
                    <li>• Prefira fundos simples e neutros</li>
                    <li>• Informe sua altura para simulação mais precisa do tamanho</li>
                    <li>• A IA considera o tamanho selecionado para mostrar o caimento realista</li>
                    <li>• Tamanhos maiores que seu corpo mostrarão roupas mais folgadas</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default VirtualFitting;

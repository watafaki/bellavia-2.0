const features = [
  {
    title: 'Caimento Premium',
    description: 'Modelagem inteligente com ajuste perfeito e mantendo a identidade do corte.',
  },
  {
    title: 'Durabilidade',
    description: 'Tecidos selecionados para aguentar a rotina sem perder a estrutura.',
  },
  {
    title: 'Edição Limitada',
    description: 'Peças exclusivas. Quando acabar, não volta igual.',
  },
];

const Features = () => {
  return (
    <section className="py-24 bg-accent/50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-0.5 bg-primary mx-auto mb-6" />
              <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-4 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

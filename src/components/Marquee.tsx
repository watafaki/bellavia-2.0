const Marquee = () => {
  const text = "BELLAVIA 2026 • CALÇAS PREMIUM • ATÉ 3X SEM JUROS • ESTOQUE LIMITADO • ";
  
  return (
    <div className="bg-foreground text-background h-9 flex items-center overflow-hidden whitespace-nowrap fixed top-0 left-0 right-0 z-[60]">
      <div className="animate-marquee inline-block">
        <span className="text-[11px] font-medium tracking-[0.08em]">
          {text.repeat(10)}
        </span>
      </div>
    </div>
  );
};

export default Marquee;

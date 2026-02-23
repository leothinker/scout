import { Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface ScoringModalProps {
  players: Player[];
}

export function ScoringModal({ players }: ScoringModalProps) {
  const sortedPlayers = [...players].sort((a,b) => (b.finalScore||0) - (a.finalScore||0));

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex items-center justify-center z-50 p-6">
      <Card className="w-full max-w-sm shadow-2xl border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-4xl font-black mb-8 text-center bg-gradient-to-br from-primary to-primary/40 bg-clip-text text-transparent italic tracking-tight">GAME OVER</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 mb-8">
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className="flex justify-between items-center p-5 bg-secondary/50 rounded-2xl border border-primary/5 transition-transform hover:scale-105">
              <div className="flex gap-4 items-center">
                <span className="text-muted-foreground font-black text-xs">#{i+1}</span>
                <span className="font-bold text-lg">{p.name}</span>
              </div>
              <span className="text-3xl font-black text-primary">{p.finalScore}</span>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button className="w-full py-6 text-xl font-black tracking-widest uppercase rounded-2xl h-14" onClick={() => window.location.reload()}>PLAY AGAIN</Button>
        </CardFooter>
      </Card>
    </div>
  );
}

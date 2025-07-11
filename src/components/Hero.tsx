
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Hero = () => {
  const { user } = useAuth();

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Track, Manage, and Grow Your Crypto Portfolio
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Galanfi provides powerful tools to track your cryptocurrency investments, analyze market trends, and make informed decisions.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              {user ? (
                <Button size="lg" asChild>
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link to="/register">Get Started</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/market">Explore Market</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative w-full max-w-[500px] aspect-square overflow-hidden rounded-xl">
              <img
                src="https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1000"
                alt="Cryptocurrency dashboard"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
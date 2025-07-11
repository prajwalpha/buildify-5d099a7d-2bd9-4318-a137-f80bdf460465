
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, LineChart, PieChart, Wallet, Eye, History, Shield, TrendingUp } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: BarChart3,
      title: 'Market Analysis',
      description: 'Real-time data and charts for all major cryptocurrencies with detailed market insights.'
    },
    {
      icon: Wallet,
      title: 'Portfolio Tracking',
      description: 'Track your crypto holdings across multiple wallets and exchanges in one place.'
    },
    {
      icon: Eye,
      title: 'Watchlists',
      description: 'Create custom watchlists to monitor cryptocurrencies you\'re interested in.'
    },
    {
      icon: History,
      title: 'Transaction History',
      description: 'Keep a detailed record of all your cryptocurrency transactions.'
    },
    {
      icon: PieChart,
      title: 'Portfolio Allocation',
      description: 'Visualize your portfolio distribution and optimize your investment strategy.'
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Your data is encrypted and protected with industry-standard security measures.'
    },
    {
      icon: LineChart,
      title: 'Performance Tracking',
      description: 'Monitor the performance of your investments over time with detailed analytics.'
    },
    {
      icon: TrendingUp,
      title: 'Price Alerts',
      description: 'Set up custom alerts to notify you of significant price movements.'
    }
  ];

  return (
    <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Powerful Features</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Everything you need to manage your cryptocurrency investments in one place
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {features.map((feature, index) => (
            <Card key={index} className="bg-background">
              <CardHeader className="pb-2">
                <feature.icon className="h-12 w-12 mb-2 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
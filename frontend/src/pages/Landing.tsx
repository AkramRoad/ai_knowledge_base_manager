import { useNavigate } from "react-router-dom";
import { AdminButton } from "@/components/ui/admin-button";
import { LogIn, Shield } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate("/select");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto px-6">
        <div className="text-center space-y-8">
          {/* Logo/Brand Section */}
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-hero rounded-2xl shadow-elevated">
              <Shield className="h-12 w-12 text-primary-foreground" />
            </div>
          </div>
          
          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground whitespace-nowrap">
              AI Knowledge Management
            </h1>
            <p className="text-xl text-muted-foreground">
              Manage the knowledge your AI can access.
            </p>
          </div>

          {/* Login Button */}
          <div className="pt-4">
            <AdminButton 
              variant="admin" 
              size="hero" 
              onClick={handleLogin}
              className="w-full max-w-xs"
            >
              <LogIn className="h-5 w-5" />
              Login
            </AdminButton>
          </div>

          {/* Footer note */}
          <p className="text-sm text-muted-foreground">
            For administrators only. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
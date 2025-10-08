import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminButton } from "@/components/ui/admin-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Database, Calendar, FileText, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VectorStore {
  id: string;
  name: string;
  object: string;
  status: string;
  last_active_at: number;
  created_at: number;
  file_counts: {
    total: number;
    completed: number;
    failed: number;
    in_progress: number;
    cancelled: number;
  };
}

  const VectorStoreSelection = () => {
    const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();

  useEffect(() => {
    const fetchVectorStores = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/v1/vector-stores");
        const json = await response.json();

        if (json.status === "success") {
          setVectorStores(json.data); // <-- only set the array
        } else {
          console.error("Failed to fetch vector stores:", json.message);
        }
      } catch (error) {
        console.error("Failed to fetch vector stores", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVectorStores();
  }, []);

////
  const formatDate = (unixTimestamp: number) => {
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleContinue = () => {
    if (!selectedStore) {
      toast({
        title: "Please select an AI Assistant",
        description: "Choose a vector store to continue to the dashboard.",
        variant: "destructive"
      });
      return;
    }
    navigate(`/dashboard/${selectedStore}`);
  };

  const selectedStoreData = vectorStores.find(store => store.id === selectedStore);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </AdminButton>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Select Knowledge Base</h1>
            <p className="text-muted-foreground">Choose the knowledge base to manage</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Selection Card */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Knowledge Base
              </CardTitle>
              <CardDescription>
                Choose a knowledge base to continue to the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loading ? "Loading..." : "Select a knowledge base"} />
                </SelectTrigger>
                <SelectContent>
                  {vectorStores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{store.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Selected Store Details */}
          {selectedStoreData && (
            <Card className="shadow-card bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-lg">Assistant Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                    <Activity className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground capitalize">{selectedStoreData.status}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Last Active</p>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedStoreData.last_active_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">{formatDate(selectedStoreData.created_at)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Content Count</p>
                      <p className="text-sm text-muted-foreground">{selectedStoreData.file_counts.completed}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Continue Button */}
          <div className="flex justify-end">
            <AdminButton
              variant="admin"
              size="lg"
              onClick={handleContinue}
              disabled={!selectedStore}
            >
              Continue to Dashboard
            </AdminButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VectorStoreSelection;
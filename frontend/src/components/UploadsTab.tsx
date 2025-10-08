import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Image, FileSpreadsheet } from "lucide-react";

const UploadsTab = () => {
  const supportedFormats = [
    { icon: FileText, name: "PDF", description: "Portable Document Format" },
    { icon: Image, name: "Images", description: "PNG, JPEG, TIFF, BMP, WEBP" },
    { icon: FileText, name: "Documents", description: "DOCX, PPTX" },
    { icon: FileSpreadsheet, name: "Spreadsheets", description: "XLSX, CSV" },
  ];

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          File Uploads
        </CardTitle>
        <CardDescription>
          Upload documents and images to expand your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-muted rounded-full">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">Uploads Coming Soon</h3>
          <p className="text-muted-foreground mb-6">
            File upload functionality will be available in the next update
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {supportedFormats.map((format, index) => (
              <div key={index} className="flex flex-col items-center p-4 bg-admin-surface rounded-lg border border-admin-border">
                <format.icon className="h-6 w-6 text-primary mb-2" />
                <div className="text-sm font-medium">{format.name}</div>
                <div className="text-xs text-muted-foreground text-center mt-1">
                  {format.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadsTab;
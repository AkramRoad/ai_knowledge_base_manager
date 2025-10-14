import { useState, useEffect, useRef } from "react"; // Import useRef
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminButton } from "@/components/ui/admin-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { IndeterminateCheckbox } from "@/components/ui/indeterminate-checkbox";
import { 
  Folder, 
  FileText, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Filter,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Module-scope variables for caching.
let catalogCache: { spaces: ConfluenceSpace[]; enabledPageIds: string[] } | null = null;
let isFetching = false;

// --- TypeScript Interfaces ---
interface ConfluencePage {
  id: string;
  title: string;
  parentId: string | null;
  children: ConfluencePage[];
}

interface ConfluenceSpace {
  id: string;
  name: string;
  key: string;
  pages: ConfluencePage[];
}

interface ToggleState {
  checked: boolean;
  indeterminate: boolean;
}

interface ConfluenceTabProps {
  vectorStoreId: string;
}

const ConfluenceTab = ({ vectorStoreId }: ConfluenceTabProps) => {
  // --- Component State ---
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([]);
  const [enabledPageIds, setEnabledPageIds] = useState<Set<string>>(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPageId, setSearchPageId] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  // --- START: MODIFICATION FOR SEARCH ---
  // Create a ref to hold parent lookup maps for efficient ancestor searching.
  // This avoids re-calculating on every render.
  const parentMapsRef = useRef<{ pageToParent: Map<string, string>; pageToSpace: Map<string, string> } | null>(null);
  // --- END: MODIFICATION FOR SEARCH ---

  // Effect 1: Handles INITIAL data loading and populating state from the cache.
  useEffect(() => {
    // Helper function to build the parent lookup maps for quick traversal.
    const buildParentMaps = (spacesToMap: ConfluenceSpace[]) => {
      const pageToParent = new Map<string, string>();
      const pageToSpace = new Map<string, string>();

      function traverse(pages: ConfluencePage[], spaceId: string, parentId?: string) {
        pages.forEach(page => {
          pageToSpace.set(page.id, spaceId);
          if (parentId) {
            pageToParent.set(page.id, parentId);
          }
          if (page.children.length > 0) {
            traverse(page.children, spaceId, page.id);
          }
        });
      }

      spacesToMap.forEach(space => traverse(space.pages, space.id));
      parentMapsRef.current = { pageToParent, pageToSpace };
    };
    
    const fetchData = async () => {
      if (!vectorStoreId) { setLoading(false); return; }

      if (catalogCache) {
        setSpaces(catalogCache.spaces);
        setEnabledPageIds(new Set(catalogCache.enabledPageIds));
        buildParentMaps(catalogCache.spaces); // Build maps from cached data
        setLoading(false);
        return;
      }

      if (isFetching) return;
      isFetching = true;
      try {
        const [catalogRes, existingRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/v1/confluence/catalog`),
          fetch(`http://127.0.0.1:8000/v1/vectorstore/${vectorStoreId}/pages`)
        ]);

        const catalogJson = await catalogRes.json();
        const existingJson = await existingRes.json();

        const fetchedSpaces = catalogJson.status === "success" ? catalogJson.data : [];
        const fetchedPageIds = existingJson.status === "success" && Array.isArray(existingJson.data) ? existingJson.data : [];
        
        setSpaces(fetchedSpaces);
        setEnabledPageIds(new Set(fetchedPageIds));
        buildParentMaps(fetchedSpaces); // Build maps from new data

        catalogCache = { spaces: fetchedSpaces, enabledPageIds: fetchedPageIds };
      } catch (error) {
        console.error("Failed to fetch catalog or existing pages", error);
        catalogCache = null;
      } finally {
        setLoading(false);
        isFetching = false;
      }
    };
    fetchData();
  }, [vectorStoreId]);

  // Effect 2: Syncs user selections BACK to the cache.
  useEffect(() => {
    if (catalogCache) {
      catalogCache.enabledPageIds = Array.from(enabledPageIds);
    }
  }, [enabledPageIds]);

  // --- START: NEW EFFECT FOR SMOOTH SEARCH ---
  // Effect 3: Automatically expands spaces and pages to reveal search results.
  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();
    const trimmedSearchPageId = searchPageId.trim();

    if (!trimmedSearchTerm && !trimmedSearchPageId) {
      return; // Do nothing if search is empty
    }

    // Debounce to prevent running on every keystroke for a smoother experience.
    const handler = setTimeout(() => {
      if (!parentMapsRef.current || spaces.length === 0) return; // Maps or data not ready

      const { pageToParent, pageToSpace } = parentMapsRef.current;
      const spacesToExpand = new Set<string>();
      const pagesToExpand = new Set<string>();
      const lowerCaseSearchTerm = trimmedSearchTerm.toLowerCase();

      // Find all pages that match the current search filters
      for (const space of spaces) {
        const findMatches = (pages: ConfluencePage[]) => {
          for (const page of pages) {
            const titleMatch = lowerCaseSearchTerm ? page.title.toLowerCase().includes(lowerCaseSearchTerm) : true;
            const idMatch = trimmedSearchPageId ? page.id.includes(trimmedSearchPageId) : true;

            if (titleMatch && idMatch) {
              // Match found! Now find all its parents and expand them.
              const spaceId = pageToSpace.get(page.id);
              if (spaceId) {
                spacesToExpand.add(spaceId);
              }

              let currentParentId = pageToParent.get(page.id);
              while (currentParentId) {
                pagesToExpand.add(currentParentId);
                currentParentId = pageToParent.get(currentParentId);
              }
            }

            if (page.children.length > 0) {
              findMatches(page.children);
            }
          }
        };
        findMatches(space.pages);
      }
      
      // Add the found ancestors to the existing expanded sets,
      // so we don't collapse anything the user opened manually.
      if (spacesToExpand.size > 0) {
        setExpandedSpaces(prev => new Set([...prev, ...spacesToExpand]));
      }
      if (pagesToExpand.size > 0) {
        setExpandedPages(prev => new Set([...prev, ...pagesToExpand]));
      }
    }, 300); // 300ms delay

    return () => clearTimeout(handler); // Cleanup debounce on effect change
  }, [searchTerm, searchPageId, spaces]);
  // --- END: NEW EFFECT FOR SMOOTH SEARCH ---

  // --- No changes to any functions below this line ---

  const toggleSpace = (spaceId: string) => {
    setExpandedSpaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spaceId)) newSet.delete(spaceId); else newSet.add(spaceId);
      return newSet;
    });
  };

  const togglePage = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pageId)) newSet.delete(pageId); else newSet.add(pageId);
      return newSet;
    });
  };

  const togglePageEnabled = (pageId: string, enabled: boolean, page?: ConfluencePage) => {
    setEnabledPageIds(prev => {
      const newSet = new Set(prev);
      const toggleChildren = (children: ConfluencePage[], action: 'add' | 'delete') => {
        children.forEach(child => {
          newSet[action](child.id);
          toggleChildren(child.children, action);
        });
      };
  
      // If the page has children, it's a "page tree". Only toggle the children.
      if (page && page.children.length > 0) {
        toggleChildren(page.children, enabled ? 'add' : 'delete');
      } else {
        // Otherwise, it's a "real" page, so toggle it directly.
        if (enabled) {
          newSet.add(pageId);
        } else {
          newSet.delete(pageId);
        }
      }
  
      return newSet;
    });
  };

  const toggleSpaceEnabled = (spaceId: string, enabled: boolean, space: ConfluenceSpace) => {
    setEnabledPageIds(prev => {
      const newSet = new Set(prev);
      const toggleAllPagesInSpace = (pages: ConfluencePage[], enable: boolean) => {
        pages.forEach(page => {
          if (enable) newSet.add(page.id); else newSet.delete(page.id);
          toggleAllPagesInSpace(page.children, enable);
        });
      };
      toggleAllPagesInSpace(space.pages, enabled);
      return newSet;
    });
  };

  const getAllPageIds = (pages: ConfluencePage[]): string[] => {
    let ids: string[] = [];
    for (const page of pages) {
      ids.push(page.id, ...getAllPageIds(page.children));
    }
    return ids;
  };

  const getAllPageIdsInTree = (page: ConfluencePage): string[] => {
    let ids: string[] = [];
    if (page.children.length > 0) {
      for (const child of page.children) {
        ids.push(...getAllPageIdsInTree(child));
      }
    } else {
      ids.push(page.id);
    }
    return ids;
  };

  const getSpaceToggleState = (space: ConfluenceSpace): ToggleState => {
    const allPageIds = getAllPageIds(space.pages);
    if (allPageIds.length === 0) return { checked: false, indeterminate: false };
    const enabledCount = allPageIds.filter(id => enabledPageIds.has(id)).length;
    if (enabledCount === 0) return { checked: false, indeterminate: false };
    if (enabledCount === allPageIds.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const getPageToggleState = (page: ConfluencePage): ToggleState => {
    const allPageIds = getAllPageIdsInTree(page);
    if (allPageIds.length === 0) {
        // This is a parent page with no children, treat it as a single page
        const isEnabled = enabledPageIds.has(page.id);
        return { checked: isEnabled, indeterminate: false };
    }
    const enabledCount = allPageIds.filter(id => enabledPageIds.has(id)).length;
    if (enabledCount === 0) return { checked: false, indeterminate: false };
    if (enabledCount === allPageIds.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const payload = {
        user_id: "YOUR_USER_ID",
        vector_store_id: vectorStoreId,
        page_ids: Array.from(enabledPageIds),
      };
      const response = await fetch(`http://127.0.0.1:8000/v1/pages/sync-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.status === "success") {
        toast({
          title: "Sync completed",
          description: `${enabledPageIds.size} pages synchronized successfully.`,
        });
      } else {
        toast({
          title: "Sync failed",
          description: result.error || "Failed to sync pages",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Sync failed",
        description: "Network error occurred during sync",
        variant: "destructive",
      });
    }
    setSyncing(false);
  };

  const filteredSpaces = spaces.filter(space => {
    if (selectedSpace !== "all" && space.id !== selectedSpace) return false;
    if (searchTerm.trim() || searchPageId.trim()) {
      const hasMatchingPage = (pages: ConfluencePage[]): boolean => {
        return pages.some(page => {
          const titleMatch = searchTerm ? page.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) : true;
          const idMatch = searchPageId ? page.id.includes(searchPageId.trim()) : true;
          return (titleMatch && idMatch) || hasMatchingPage(page.children);
        });
      };
      return hasMatchingPage(space.pages);
    }
    return true;
  });

  const renderPage = (page: ConfluencePage, level: number = 0) => {
    const isExpanded = expandedPages.has(page.id);
    const hasChildren = page.children.length > 0;
    const toggleState = getPageToggleState(page);
    
    const titleMatch = searchTerm ? page.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) : true;
    const idMatch = searchPageId ? page.id.includes(searchPageId.trim()) : true;
    
    const hasVisibleChild = (p: ConfluencePage): boolean => {
      return p.children.some(child => {
          const childTitleMatch = searchTerm ? child.title.toLowerCase().includes(searchTerm.trim().toLowerCase()) : true;
          const childIdMatch = searchPageId ? child.id.includes(searchPageId.trim()) : true;
          return (childTitleMatch && childIdMatch) || hasVisibleChild(child);
      });
    };
    
    if (!(titleMatch && idMatch) && !hasVisibleChild(page)) {
        return null;
    }

    return (
      <div key={page.id} className="space-y-1">
        <div 
          className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
          style={{ marginLeft: `${level * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => togglePage(page.id)}
              className="p-1 hover:bg-muted rounded"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : <div className="w-6" />}
          
          <FileText className={`h-4 w-4 ${toggleState.indeterminate ? 'text-orange-500' : 'text-muted-foreground'}`} />
          
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm">{page.title}</span>
            <Badge variant="outline" className="text-xs">{page.id}</Badge>
            {toggleState.indeterminate && <Badge variant="secondary" className="text-xs">Partial</Badge>}
          </div>
          
          <IndeterminateCheckbox
            checked={toggleState.checked}
            indeterminate={toggleState.indeterminate}
            onCheckedChange={(checked) => {
              const shouldEnable = toggleState.indeterminate ? true : !!checked;
              togglePageEnabled(page.id, shouldEnable, page);
            }}
          />
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {page.children.map(child => renderPage(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Confluence Content
        </CardTitle>
        <CardDescription>
          Manage which Confluence pages are included in your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search by Title</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Search by Page ID</label>
            <Input
              placeholder="Enter page ID..."
              value={searchPageId}
              onChange={(e) => setSearchPageId(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Space</label>
            <Select value={selectedSpace} onValueChange={setSelectedSpace}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Spaces</SelectItem>
                {spaces.map(space => (
                  <SelectItem key={space.id} value={space.id}>
                    {space.name} ({space.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 bg-admin-surface rounded-lg border border-admin-border">
          <div>
            <p className="font-medium">Sync Selected Pages</p>
            <p className="text-sm text-muted-foreground">
              {enabledPageIds.size} pages selected for synchronization
            </p>
          </div>
          <AdminButton
            variant="success"
            onClick={handleSync}
            disabled={syncing || enabledPageIds.size === 0}
          >
            <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {syncing ? "Syncing..." : "Sync Now"}
          </AdminButton>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading Confluence content...</p>
            </div>
          ) : (
            filteredSpaces.map((space) => {
              const spaceToggleState = getSpaceToggleState(space);
              return (
                <div key={space.id} className="border border-admin-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => toggleSpace(space.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      {expandedSpaces.has(space.id) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                    <Folder className={`h-5 w-5 ${spaceToggleState.indeterminate ? 'text-orange-500' : spaceToggleState.checked ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="font-medium flex-1">{space.name}</span>
                    <Badge variant="secondary">{space.key}</Badge>
                    {spaceToggleState.indeterminate && <Badge variant="outline" className="text-xs">Partial</Badge>}
                    <IndeterminateCheckbox
                      checked={spaceToggleState.checked}
                      indeterminate={spaceToggleState.indeterminate}
                      onCheckedChange={(checked) => {
                        const shouldEnable = spaceToggleState.indeterminate ? true : !!checked;
                        toggleSpaceEnabled(space.id, shouldEnable, space);
                      }}
                    />
                  </div>
                  
                  {expandedSpaces.has(space.id) && (
                    <div className="mt-4 space-y-1">
                      {space.pages.map(page => renderPage(page))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfluenceTab;
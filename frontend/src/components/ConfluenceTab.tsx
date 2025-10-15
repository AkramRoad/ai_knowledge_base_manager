import { useState, useEffect, useRef, useMemo } from "react";
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
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- Configuration ---
const ADD_LIMIT = 100;

// Module-scope cache that stores data per vector store
const catalogCache: Map<string, { spaces: ConfluenceSpace[]; enabledPageIds: string[] }> = new Map();
const fetchingStores = new Set<string>();

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
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([]);
  const [enabledPageIds, setEnabledPageIds] = useState<Set<string>>(new Set());
  const [originalPageIds, setOriginalPageIds] = useState<Set<string>>(new Set());
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [searchPageId, setSearchPageId] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const parentMapsRef = useRef<{ pageToParent: Map<string, string>; pageToSpace: Map<string, string> } | null>(null);
  const parentPageIdsRef = useRef<Set<string>>(new Set());

  const syncChanges = useMemo(() => {
    const parentIds = parentPageIdsRef.current;

    const realEnabledIds = new Set(
      [...enabledPageIds].filter(id => !parentIds.has(id))
    );
    const realOriginalIds = new Set(
      [...originalPageIds].filter(id => !parentIds.has(id))
    );

    const toAdd = new Set<string>();
    for (const id of realEnabledIds) {
      if (!realOriginalIds.has(id)) {
        toAdd.add(id);
      }
    }

    const toRemove = new Set<string>();
    for (const id of realOriginalIds) {
      if (!realEnabledIds.has(id)) {
        toRemove.add(id);
      }
    }
    
    const hasChanges = toAdd.size > 0 || toRemove.size > 0;
    const isOverLimit = toAdd.size > ADD_LIMIT;

    return {
      addedCount: toAdd.size,
      removedCount: toRemove.size,
      finalTotal: realEnabledIds.size,
      hasChanges,
      isOverLimit,
    };
  }, [enabledPageIds, originalPageIds]);

  useEffect(() => {
    const buildTreeMetadata = (spacesToMap: ConfluenceSpace[]) => {
      const pageToParent = new Map<string, string>();
      const pageToSpace = new Map<string, string>();
      const parentIds = new Set<string>();

      function traverse(pages: ConfluencePage[], spaceId: string, parentId?: string) {
        pages.forEach(page => {
          pageToSpace.set(page.id, spaceId);
          if (parentId) pageToParent.set(page.id, parentId);

          if (page.children.length > 0) {
            parentIds.add(page.id);
            traverse(page.children, spaceId, page.id);
          }
        });
      }

      spacesToMap.forEach(space => traverse(space.pages, space.id));
      parentMapsRef.current = { pageToParent, pageToSpace };
      parentPageIdsRef.current = parentIds;
    };
    
    const fetchData = async () => {
      if (!vectorStoreId) { 
        setLoading(false); 
        return; 
      }

      setLoading(true);
      try {
        let fetchedSpaces: ConfluenceSpace[];
        let fetchedPageIds: string[];

        // Check if we have cached data for THIS specific vector store
        const cachedData = catalogCache.get(vectorStoreId);
        
        if (cachedData) {
          fetchedSpaces = cachedData.spaces;
          fetchedPageIds = cachedData.enabledPageIds;
        } else {
          // Prevent duplicate fetches for the same vector store
          if (fetchingStores.has(vectorStoreId)) return;
          fetchingStores.add(vectorStoreId);
          
          const [catalogRes, existingRes] = await Promise.all([
            fetch(`http://127.0.0.1:8000/v1/confluence/catalog`),
            fetch(`http://127.0.0.1:8000/v1/vectorstore/${vectorStoreId}/pages`)
          ]);

          const catalogJson = await catalogRes.json();
          const existingJson = await existingRes.json();

          fetchedSpaces = catalogJson.status === "success" ? catalogJson.data : [];
          fetchedPageIds = existingJson.status === "success" && Array.isArray(existingJson.data) ? existingJson.data : [];
          
          // Store in cache with vector store ID as key
          catalogCache.set(vectorStoreId, { spaces: fetchedSpaces, enabledPageIds: fetchedPageIds });
          fetchingStores.delete(vectorStoreId);
        }
        
        const initialPageIdsSet = new Set(fetchedPageIds);
        setSpaces(fetchedSpaces);
        setEnabledPageIds(initialPageIdsSet);
        setOriginalPageIds(initialPageIdsSet);
        buildTreeMetadata(fetchedSpaces);

      } catch (error) {
        console.error("Failed to fetch catalog or existing pages", error);
        catalogCache.delete(vectorStoreId);
        fetchingStores.delete(vectorStoreId);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vectorStoreId]);

  // Effect 2: Syncs user selections BACK to the cache for THIS vector store
  useEffect(() => {
    if (vectorStoreId && catalogCache.has(vectorStoreId)) {
      const cached = catalogCache.get(vectorStoreId)!;
      cached.enabledPageIds = Array.from(enabledPageIds);
    }
  }, [enabledPageIds, vectorStoreId]);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();
    const trimmedSearchPageId = searchPageId.trim();
    if (!trimmedSearchTerm && !trimmedSearchPageId) return;

    const handler = setTimeout(() => {
      if (!parentMapsRef.current || spaces.length === 0) return;
      const { pageToParent, pageToSpace } = parentMapsRef.current;
      const spacesToExpand = new Set<string>();
      const pagesToExpand = new Set<string>();
      const lowerCaseSearchTerm = trimmedSearchTerm.toLowerCase();

      for (const space of spaces) {
        const findMatches = (pages: ConfluencePage[]) => {
          for (const page of pages) {
            const titleMatch = lowerCaseSearchTerm ? page.title.toLowerCase().includes(lowerCaseSearchTerm) : true;
            const idMatch = trimmedSearchPageId ? page.id.includes(trimmedSearchPageId) : true;
            if (titleMatch && idMatch) {
              const spaceId = pageToSpace.get(page.id);
              if (spaceId) spacesToExpand.add(spaceId);
              let currentParentId = pageToParent.get(page.id);
              while (currentParentId) {
                pagesToExpand.add(currentParentId);
                currentParentId = pageToParent.get(currentParentId);
              }
            }
            if (page.children.length > 0) findMatches(page.children);
          }
        };
        findMatches(space.pages);
      }
      
      if (spacesToExpand.size > 0) setExpandedSpaces(prev => new Set([...prev, ...spacesToExpand]));
      if (pagesToExpand.size > 0) setExpandedPages(prev => new Set([...prev, ...pagesToExpand]));
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm, searchPageId, spaces]);

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

  const togglePageEnabled = (pageId: string, enabled: boolean, page: ConfluencePage) => {
    setEnabledPageIds(prev => {
      const newSet = new Set(prev);
      const toggleChildren = (p: ConfluencePage, action: 'add' | 'delete') => {
        newSet[action](p.id);
        p.children.forEach(child => {
          toggleChildren(child, action);
        });
      };
  
      if (page.children.length > 0) {
        toggleChildren(page, enabled ? 'add' : 'delete');
      } else {
        if (enabled) newSet.add(pageId); else newSet.delete(pageId);
      }
      return newSet;
    });
  };

  const toggleSpaceEnabled = (spaceId: string, enabled: boolean, space: ConfluenceSpace) => {
    setEnabledPageIds(prev => {
      const newSet = new Set(prev);
      const toggleAllPagesInSpace = (pages: ConfluencePage[], enable: boolean) => {
        pages.forEach(page => {
          newSet[enable ? 'add' : 'delete'](page.id);
          toggleAllPagesInSpace(page.children, enable);
        });
      };
      toggleAllPagesInSpace(space.pages, enabled);
      return newSet;
    });
  };

  const getAllPageIds = (pages: ConfluencePage[]): string[] => {
    return pages.flatMap(page => [page.id, ...getAllPageIds(page.children)]);
  };

  const getAllPageIdsInTree = (page: ConfluencePage): string[] => {
    return [page.id, ...page.children.flatMap(child => getAllPageIdsInTree(child))];
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
    if (allPageIds.length === 1) {
      return { checked: enabledPageIds.has(page.id), indeterminate: false };
    }
    const enabledCount = allPageIds.filter(id => enabledPageIds.has(id)).length;
    if (enabledCount === 0) return { checked: false, indeterminate: false };
    if (enabledCount === allPageIds.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const realPageIdsToSync = Array.from(enabledPageIds).filter(
        id => !parentPageIdsRef.current.has(id)
      );

      const payload = {
        user_id: "YOUR_USER_ID",
        vector_store_id: vectorStoreId,
        page_ids: realPageIdsToSync,
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
          description: `Knowledge base updated to ${realPageIdsToSync.length} pages.`,
        });
        setOriginalPageIds(new Set(enabledPageIds));
      } else {
        toast({
          title: "Sync failed",
          description: result.message || "Failed to sync pages",
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
    
    if (!(titleMatch && idMatch) && !hasVisibleChild(page)) return null;

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

        <div className="flex flex-col p-4 bg-admin-surface rounded-lg border border-admin-border gap-3">
          <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Review & Sync Changes</p>
                {syncChanges.hasChanges ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="text-green-500 font-semibold">+{syncChanges.addedCount} pages</span>,{' '}
                    <span className="text-red-500 font-semibold">-{syncChanges.removedCount} pages</span>.
                    <span className="block sm:inline sm:ml-1">Final total will be {syncChanges.finalTotal} pages.</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No changes to sync. {syncChanges.finalTotal} pages are currently active.
                  </p>
                )}
              </div>
              <AdminButton
                variant="success"
                onClick={handleSync}
                disabled={syncing || !syncChanges.hasChanges || syncChanges.isOverLimit}
              >
                <RefreshCw className={syncing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                {syncing ? "Syncing..." : "Sync Now"}
              </AdminButton>
          </div>
          
          {syncChanges.isOverLimit && (
            <p className="text-sm text-red-600 font-semibold text-center border-t border-admin-border pt-3">
              You can't add more than {ADD_LIMIT} pages at once. Please deselect some pages to continue.
            </p>
          )}
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
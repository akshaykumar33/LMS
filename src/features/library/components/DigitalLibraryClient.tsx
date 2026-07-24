"use client";

import React, { useState, useTransition, useEffect } from "react";
import { Search, Download, BookOpen, Bookmark, Plus, Edit2, Trash2, Loader2, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createLibraryItemAction, updateLibraryItemAction, deleteLibraryItemAction } from "../actions/library-actions";
import { formatDate } from "@/utils/date-formatter";

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  fileUrl: string;
  category: string;
  createdAt: Date | string;
}

interface DigitalLibraryClientProps {
  items: LibraryItem[];
  userRole?: string;
  primaryColor?: string;
}

export function DigitalLibraryClient({ items, userRole, primaryColor = "#0284c7" }: DigitalLibraryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [isPending, startTransition] = useTransition();

  // Save/Bookmark State
  const [savedResourceIds, setSavedResourceIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_library_resources");
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSavedResourceIds(new Set(JSON.parse(saved)));
      }
    } catch (e) {
      console.error("Failed to load saved resources", e);
    }
  }, []);

  const handleSaveResource = (id: string) => {
    setIsSaving(id);
    // Simulate network delay for better UX as requested
    setTimeout(() => {
      setSavedResourceIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        localStorage.setItem("saved_library_resources", JSON.stringify(Array.from(next)));
        return next;
      });
      setIsSaving(null);
    }, 400);
  };

  // CRUD Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<LibraryItem | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [category, setCategory] = useState("worksheet");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isStaff = userRole && ["Owner", "Admin", "Faculty", "Program Manager"].includes(userRole);

  const categories = [
    { value: "all", label: "All Resources" },
    { value: "book", label: "Textbooks" },
    { value: "research_paper", label: "Research Papers" },
    { value: "manual", label: "Reference Manuals" },
    { value: "worksheet", label: "Practice Sheets" },
    { value: "excel", label: "Excel Spreadsheets" },
    { value: "ppt", label: "Presentations" },
    { value: "audio", label: "Audio Briefings" }
  ];

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setDescription("");
    setFileUrl("");
    setCategory("worksheet");
    setErrorMessage(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || !fileUrl.trim()) {
      setErrorMessage("Title and File URL are required.");
      return;
    }

    startTransition(async () => {
      const res = await createLibraryItemAction({
        title,
        author: author.trim() || "",
        description: description.trim() || "",
        fileUrl,
        category,
      });

      if (res.success) {
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        setErrorMessage(res.error || "Failed to create resource.");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setErrorMessage(null);

    if (!title.trim() || !fileUrl.trim()) {
      setErrorMessage("Title and File URL are required.");
      return;
    }

    startTransition(async () => {
      const res = await updateLibraryItemAction(editingItem.id, {
        title,
        author: author.trim() || "",
        description: description.trim() || "",
        fileUrl,
        category,
      });

      if (res.success) {
        setIsEditDialogOpen(false);
        setEditingItem(null);
        resetForm();
      } else {
        setErrorMessage(res.error || "Failed to update resource.");
      }
    });
  };

  const handleDeleteSubmit = () => {
    if (!deletingItem) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await deleteLibraryItemAction(deletingItem.id);

      if (res.success) {
        setIsDeleteDialogOpen(false);
        setDeletingItem(null);
      } else {
        setErrorMessage(res.error || "Failed to delete resource.");
      }
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (val: string) => {
    if (val === "all") return items.length;
    return items.filter(item => item.category === val).length;
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "book":
        return "bg-sky-500/10 text-sky-400 border-sky-500/25";
      case "research_paper":
        return "bg-purple-500/10 text-purple-400 border-purple-500/25";
      case "manual":
        return "bg-amber-500/10 text-amber-400 border-amber-500/25";
      case "worksheet":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      case "excel":
        return "bg-teal-500/10 text-teal-400 border-teal-500/25";
      case "ppt":
        return "bg-rose-500/10 text-rose-400 border-rose-500/25";
      case "audio":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/25";
      default:
        return "bg-secondary text-muted-foreground border-border";
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "book":
        return "Textbook";
      case "research_paper":
        return "Research Paper";
      case "manual":
        return "Reference Manual";
      case "worksheet":
        return "Practice Worksheet";
      case "excel":
        return "Excel Spreadsheet";
      case "ppt":
        return "Presentation Slide";
      case "audio":
        return "Audio Briefing";
      default:
        return cat;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-3xl font-black text-foreground flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-primary" style={{ color: primaryColor }} /> Digital Reference Library
          </h1>
          <p className="text-xs text-muted-foreground">
            Browse and download textbooks, reference manuals, research papers, and practice sheets curated for semiconductor engineering.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            className="flex items-center gap-1.5 bg-primary text-white font-extrabold text-xs px-4 py-2.5 rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md self-start sm:self-center shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-4 rounded-2xl border border-border/80">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title, author, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/25 border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.value);
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.value
                    ? "text-white shadow-md"
                    : "bg-secondary/20 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                }`}
                style={selectedCategory === cat.value ? { backgroundColor: primaryColor } : undefined}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${selectedCategory === cat.value ? "bg-black/20 text-white" : "bg-secondary/60 text-muted-foreground"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Library Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="sexy-border-glow bg-card/45 backdrop-blur-md rounded-2xl p-5 border border-border flex flex-col justify-between hover:shadow-lg transition-all group"
            >
              <div className="space-y-3">
                {/* Badge Category */}
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryBadge(item.category)}`}>
                    {getCategoryLabel(item.category)}
                  </span>
                  
                  {/* Save/Bookmark Button */}
                  <button 
                    onClick={() => handleSaveResource(item.id)}
                    disabled={isSaving === item.id}
                    title={savedResourceIds.has(item.id) ? "Remove from saved" : "Save this resource"}
                    className="flex items-center justify-center p-1.5 rounded-md transition-all hover:bg-secondary/50 focus:outline-none"
                  >
                    {isSaving === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                    ) : savedResourceIds.has(item.id) ? (
                      <Bookmark className="w-3.5 h-3.5 fill-primary text-primary drop-shadow-sm" style={{ color: primaryColor, fill: primaryColor }} />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                    )}
                  </button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-black text-foreground line-clamp-2 leading-relaxed group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  {item.author && (
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      by <span className="text-foreground/80">{item.author}</span>
                    </p>
                  )}
                </div>

                {item.description && (
                  <p className="text-[10px] text-muted-foreground/90 leading-relaxed font-sans line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action Footer */}
              <div className="border-t border-border/60 pt-4 mt-4 flex items-center justify-between gap-4">
                <span className="text-[9px] text-muted-foreground font-mono">
                  Curated: {formatDate(item.createdAt)}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {isStaff && (
                    <>
                      <button
                        onClick={() => {
                          setTitle(item.title);
                          setAuthor(item.author || "");
                          setDescription(item.description || "");
                          setFileUrl(item.fileUrl);
                          setCategory(item.category);
                          setEditingItem(item);
                          setIsEditDialogOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-secondary/40 rounded-xl transition-all cursor-pointer border border-border"
                        title="Edit Resource"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingItem(item);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all cursor-pointer border border-border"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {/* Download PDF Logic */}
                  {(() => {
                    const isPdf = item.fileUrl?.toLowerCase().endsWith(".pdf") || 
                                  ["book", "research_paper", "manual", "worksheet"].includes(item.category);
                    const isAvailable = Boolean(item.fileUrl) && isPdf;

                    if (isAvailable) {
                      return (
                        <a
                          href={`/api/download?id=${item.id}`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all cursor-pointer border border-primary/20 shadow-sm"
                          style={{ borderColor: primaryColor }}
                        >
                          <Download className="w-3 h-3" /> Download PDF
                        </a>
                      );
                    }

                    return (
                      <span
                        className="flex items-center gap-1.5 bg-secondary/30 text-muted-foreground/60 font-extrabold text-[10px] px-3.5 py-2 rounded-xl border border-border/50 cursor-not-allowed"
                        title="PDF format is not available for this resource."
                      >
                        <Download className="w-3 h-3 opacity-40" /> PDF Unavailable
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 bg-card/20 border border-dashed rounded-3xl p-8">
          <span className="text-2xl">📚</span>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-foreground">No resources found</h4>
            <p className="text-[10px] text-muted-foreground">Try adjusting your keywords or category filters.</p>
          </div>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-border/80">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Add Library Resource
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload and publish new textbook, manual, research paper, or practice worksheet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="add-title" className="text-xs font-bold text-muted-foreground uppercase">Resource Title *</Label>
              <Input
                id="add-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CMOS VLSI Circuit Layouts"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-author" className="text-xs font-bold text-muted-foreground uppercase">Author / Organization</Label>
              <Input
                id="add-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Neil Weste, David Harris"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-category" className="text-xs font-bold text-muted-foreground uppercase">Category</Label>
              <select
                id="add-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="book" className="bg-card text-foreground">Textbook</option>
                <option value="research_paper" className="bg-card text-foreground">Research Paper</option>
                <option value="manual" className="bg-card text-foreground">Reference Manual</option>
                <option value="worksheet" className="bg-card text-foreground">Practice Sheet / Worksheet</option>
                <option value="excel" className="bg-card text-foreground">Excel Spreadsheet</option>
                <option value="ppt" className="bg-card text-foreground">Presentation Slide</option>
                <option value="audio" className="bg-card text-foreground">Audio Briefing</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-fileurl" className="text-xs font-bold text-muted-foreground uppercase">Document PDF URL *</Label>
              <Input
                id="add-fileurl"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                type="url"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-desc" className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
              <textarea
                id="add-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this resource covers..."
                className="w-full min-h-[80px] bg-secondary/40 border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isPending}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Publishing...
                  </>
                ) : (
                  "Publish Resource"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border border-border/80">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" style={{ color: primaryColor }} /> Edit Library Resource
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify resource metadata, category, or file URL.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-title" className="text-xs font-bold text-muted-foreground uppercase">Resource Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CMOS VLSI Circuit Layouts"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-author" className="text-xs font-bold text-muted-foreground uppercase">Author / Organization</Label>
              <Input
                id="edit-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Neil Weste, David Harris"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-category" className="text-xs font-bold text-muted-foreground uppercase">Category</Label>
              <select
                id="edit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="book" className="bg-card text-foreground">Textbook</option>
                <option value="research_paper" className="bg-card text-foreground">Research Paper</option>
                <option value="manual" className="bg-card text-foreground">Reference Manual</option>
                <option value="worksheet" className="bg-card text-foreground">Practice Sheet / Worksheet</option>
                <option value="excel" className="bg-card text-foreground">Excel Spreadsheet</option>
                <option value="ppt" className="bg-card text-foreground">Presentation Slide</option>
                <option value="audio" className="bg-card text-foreground">Audio Briefing</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-fileurl" className="text-xs font-bold text-muted-foreground uppercase">Document PDF URL *</Label>
              <Input
                id="edit-fileurl"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/document.pdf"
                type="url"
                className="bg-secondary/40 border border-border rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-desc" className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
              <textarea
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what this resource covers..."
                className="w-full min-h-[80px] bg-secondary/40 border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isPending}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border border-border/80">
          <DialogHeader>
            <DialogTitle className="text-sm font-black flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete Library Resource
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <span className="font-semibold text-foreground">&quot;{deletingItem?.title}&quot;</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteSubmit}
              className="rounded-xl text-xs font-bold"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> Deleting...
                </>
              ) : (
                "Delete Resource"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CategoryFields from "@/components/seller/CategoryFields";
import ImageGalleryUpload from "@/components/seller/ImageGalleryUpload";
import { SUPPORTED_CURRENCIES, Currency, CURRENCY_INFO } from "@/lib/currency";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency?: string;
  category: string;
  stock_quantity: number | null;
  is_active: boolean;
  created_at: string;
  attributes?: Record<string, any> | null;
  images?: string[] | null;
}

const categories = [
  "Clothes",
  "Perfumes",
  "Home Appliances",
  "Kitchenware",
  "Electronics",
  "Books",
  "Art & Crafts",
  "Music",
  "Courses",
  "Other",
];

export default function Products() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    currency: "TZS" as Currency, // Default to TZS for Tanzanian sellers
    category: "",
    stock_quantity: "",
  });
  const [attributes, setAttributes] = useState<Record<string, any>>({});
  const [productImages, setProductImages] = useState<string[]>([]);
  
  // Stepped form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const fetchProducts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts((data || []).map(p => ({
        ...p,
        attributes: (typeof p.attributes === 'object' && p.attributes !== null) 
          ? p.attributes as Record<string, any>
          : {},
        images: p.images || [],
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    
    fetchProducts();

    // Set up real-time subscription for products
    // Use a ref to track if we're already fetching to prevent loops
    let isFetching = false;
    
    const channel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `seller_id=eq.${user.id}`,
        },
        () => {
          if (!isFetching) {
            isFetching = true;
            fetchProducts().finally(() => {
              isFetching = false;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validate minimum price before processing
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Generate title and description from category-specific fields
    let productTitle = formData.title;
    let productDescription = formData.description || null;
    let productImagesData = productImages;

    if (formData.category === "Music") {
      // Generate title from artist and music type
      const artist = attributes.artist || "";
      const musicType = attributes.musicType || "";
      const musicTypeLabel = musicType === "single" ? "Single" : 
                            musicType === "album" ? "Album" : 
                            musicType === "ep" ? "EP" : 
                            musicType === "beat" ? "Beat" : 
                            musicType === "mixtape" ? "Mixtape" : "";
      
      productTitle = artist ? `${artist} - ${musicTypeLabel}` : musicTypeLabel;
      
      // Generate description from music attributes
      const genre = attributes.genre || "";
      const duration = attributes.duration || "";
      const releaseDate = attributes.releaseDate || "";
      const parts = [];
      if (genre) parts.push(`Genre: ${genre}`);
      if (duration) parts.push(`Duration: ${duration}`);
      if (releaseDate) parts.push(`Released: ${new Date(releaseDate).toLocaleDateString()}`);
      productDescription = parts.length > 0 ? parts.join(" | ") : null;
      
      // Use album cover as the product image if available
      if (attributes.albumCover) {
        productImagesData = [attributes.albumCover];
      } else {
        productImagesData = [];
      }
    } else if (formData.category === "Books") {
      // Generate title from book title field
      const bookTitle = attributes.bookTitle || "";
      productTitle = bookTitle || "Untitled Book";
      
      // Generate description from book attributes
      const author = attributes.author || "";
      const isbn = attributes.isbn || "";
      const publisher = attributes.publisher || "";
      const format = attributes.format || "";
      const pages = attributes.pages || "";
      const parts = [];
      if (author) parts.push(`Author: ${author}`);
      if (isbn) parts.push(`ISBN: ${isbn}`);
      if (publisher) parts.push(`Publisher: ${publisher}`);
      if (format) parts.push(`Format: ${format}`);
      if (pages) parts.push(`Pages: ${pages}`);
      productDescription = parts.length > 0 ? parts.join(" | ") : null;
      
      // Use book cover as the product image if available
      if (attributes.coverImage) {
        productImagesData = [attributes.coverImage];
      } else {
        productImagesData = [];
      }
    } else if (formData.category === "Courses") {
      // Generate title from course title field
      const courseTitle = attributes.courseTitle || "";
      productTitle = courseTitle || "Untitled Course";
      
      // Generate description from course attributes
      const instructor = attributes.instructor || "";
      const skillLevel = attributes.skillLevel || "";
      const courseDuration = attributes.courseDuration || "";
      const lessonsCount = attributes.lessonsCount || "";
      const parts = [];
      if (instructor) parts.push(`Instructor: ${instructor}`);
      if (skillLevel) parts.push(`Level: ${skillLevel}`);
      if (courseDuration) parts.push(`Duration: ${courseDuration} hours`);
      if (lessonsCount) parts.push(`Lessons: ${lessonsCount}`);
      productDescription = parts.length > 0 ? parts.join(" | ") : null;
      
      // Use course thumbnail as the product image if available
      if (attributes.thumbnail) {
        productImagesData = [attributes.thumbnail];
      } else {
        productImagesData = [];
      }
    }

    // Digital products don't need stock quantity
    const isDigitalProduct = ["Music", "Books", "Courses"].includes(formData.category);
    
    const productData = {
      title: productTitle,
      description: productDescription,
      price: parseFloat(formData.price),
      currency: formData.currency, // Store seller's chosen currency
      category: formData.category,
      stock_quantity: isDigitalProduct ? null : (parseInt(formData.stock_quantity) || 0),
      seller_id: user.id,
      attributes: attributes,
      images: productImagesData,
      is_active: true, // Explicitly set to active so products are immediately visible
    };

    console.log("📦 Creating/updating product:", {
      title: productTitle,
      category: formData.category,
      is_active: true,
      seller_id: user.id,
    });

    let error;

    if (editingProduct) {
      console.log("✏️ Updating existing product:", editingProduct.id);
      const { error: updateError } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);
      error = updateError;
    } else {
      console.log("➕ Inserting new product");
      const { data: insertedData, error: insertError } = await supabase
        .from("products")
        .insert(productData)
        .select();
      error = insertError;
      if (!insertError && insertedData) {
        console.log("✅ Product created successfully:", insertedData[0]);
      }
    }

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: editingProduct ? "Product updated" : "Product created",
        description: `${productTitle} has been ${editingProduct ? "updated" : "added"} successfully.`,
      });
      setIsDialogOpen(false);
      setEditingProduct(null);
      setCurrentStep(1); // Reset to first step
      setFormData({
        title: "",
        description: "",
        price: "",
        currency: "TZS" as Currency,
        category: "",
        stock_quantity: "",
      });
      setAttributes({});
      setProductImages([]);
      fetchProducts();
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const isDigital = ["Music", "Books", "Courses"].includes(product.category);
    setFormData({
      title: product.title,
      description: product.description || "",
      price: product.price.toString(),
      currency: (product.currency || "TZS") as Currency,
      category: product.category,
      stock_quantity: isDigital ? "" : (product.stock_quantity?.toString() || ""),
    });
    setAttributes(product.attributes || {});
    setProductImages(product.images || []);
    setCurrentStep(1); // Reset to first step
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Product deleted",
        description: "The product has been removed.",
      });
      fetchProducts();
    }
  };

  const toggleActive = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product listings and inventory.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="hero"
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  title: "",
                  description: "",
                  price: "",
                  currency: "TZS" as Currency,
                  category: "",
                  stock_quantity: "",
                });
                setAttributes({});
                setProductImages([]);
                setCurrentStep(1);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct 
                  ? "Update your product information below." 
                  : "Follow the steps to add a new product to your store."}
              </DialogDescription>
            </DialogHeader>
            
            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                          step < currentStep
                            ? "border-primary bg-primary text-primary-foreground"
                            : step === currentStep
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted bg-background text-muted-foreground"
                        }`}
                      >
                        {step < currentStep ? (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-sm font-semibold">{step}</span>
                        )}
                      </div>
                      <span className="mt-2 text-xs font-medium text-center">
                        {step === 1 && "Category"}
                        {step === 2 && "Details"}
                        {step === 3 && "Pricing"}
                        {step === 4 && "Images"}
                      </span>
                    </div>
                    {step < 4 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${
                          step < currentStep ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ScrollArea className="max-h-[50vh] pr-4">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Category Selection */}
                {currentStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-base font-semibold">
                        Select Product Category *
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Choose the category that best describes your product
                      </p>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => {
                          setFormData({ ...formData, category: value });
                          setAttributes({});
                        }}
                      >
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{cat}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {formData.category && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <p className="text-sm font-medium text-primary">
                          ✓ Category selected: {formData.category}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Product Details */}
                {currentStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Generic fields - hidden for categories with specific field definitions */}
                    {![
                      "Music",
                      "Books",
                      "Courses",
                    ].includes(formData.category) && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="title" className="text-base font-semibold">
                            Product Title *
                          </Label>
                          <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) =>
                              setFormData({ ...formData, title: e.target.value })
                            }
                            placeholder="Enter a descriptive product title"
                            className="h-12"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-base font-semibold">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) =>
                              setFormData({ ...formData, description: e.target.value })
                            }
                            placeholder="Describe your product features, benefits, and details..."
                            rows={5}
                            className="resize-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Info for digital products */}
                    {["Music", "Books", "Courses"].includes(formData.category) && (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> For {formData.category} products, the title and
                          description will be automatically generated from the category-specific
                          fields you'll enter in the next step.
                        </p>
                      </div>
                    )}

                    {/* Category-specific fields */}
                    {formData.category && user && (
                      <div className="pt-4 border-t">
                        <h3 className="text-base font-semibold mb-4">
                          {formData.category}-Specific Information
                        </h3>
                        <CategoryFields
                          category={formData.category}
                          attributes={attributes}
                          onChange={setAttributes}
                          userId={user.id}
                          productId={editingProduct?.id}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Pricing & Stock */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                      <h3 className="text-base font-semibold mb-2">Pricing Information</h3>
                      <p className="text-sm text-muted-foreground">
                        Set your price in your preferred currency. Buyers will see automatic conversion.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-base font-semibold">
                          Price *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.price}
                          onChange={(e) =>
                            setFormData({ ...formData, price: e.target.value })
                          }
                          placeholder="0.00"
                          className="h-12 text-lg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency" className="text-base font-semibold">
                          Currency *
                        </Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(value) =>
                            setFormData({ ...formData, currency: value as Currency })
                          }
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPORTED_CURRENCIES.map((currency) => (
                              <SelectItem key={currency} value={currency}>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">
                                    {CURRENCY_INFO[currency].symbol}
                                  </span>
                                  <span>{currency}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {CURRENCY_INFO[currency].name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Stock Quantity - hidden for digital products */}
                    {!["Music", "Books", "Courses"].includes(formData.category) && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label htmlFor="stock" className="text-base font-semibold">
                          Stock Quantity *
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          How many units do you have available?
                        </p>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={formData.stock_quantity}
                          onChange={(e) =>
                            setFormData({ ...formData, stock_quantity: e.target.value })
                          }
                          placeholder="0"
                          className="h-12 text-lg"
                          required
                        />
                      </div>
                    )}

                    {["Music", "Books", "Courses"].includes(formData.category) && (
                      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          <strong>Digital Product:</strong> Stock quantity is not required for
                          digital products.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Images */}
                {currentStep === 4 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4">
                      <h3 className="text-base font-semibold mb-2">Product Images</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload high-quality images to showcase your product (up to 6 images)
                      </p>
                    </div>

                    {/* Image Gallery - hidden for digital/downloadable categories */}
                    {user && ![
                      "Music",
                      "Books",
                      "Courses",
                    ].includes(formData.category) ? (
                      <ImageGalleryUpload
                        images={productImages}
                        onChange={setProductImages}
                        userId={user.id}
                        maxImages={6}
                      />
                    ) : (
                      <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-8 text-center">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Digital Product:</strong> Cover image is managed through
                          category-specific fields.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="flex-1"
                    >
                      Previous
                    </Button>
                  )}
                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      variant="hero"
                      onClick={() => {
                        // Validation before moving to next step
                        if (currentStep === 1 && !formData.category) {
                          toast({
                            title: "Category required",
                            description: "Please select a category before proceeding.",
                            variant: "destructive",
                          });
                          return;
                        }
                        setCurrentStep(currentStep + 1);
                      }}
                      className="flex-1"
                    >
                      Next
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setIsDialogOpen(false);
                          setCurrentStep(1);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="hero" className="flex-1">
                        {editingProduct ? "Save Changes" : "Add Product"}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border border-border rounded-lg overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-12 animate-pulse bg-muted rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  No products found. Add your first product to get started!
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const isDigital = ["Music", "Books", "Courses"].includes(product.category);
                const hasStock = product.stock_quantity !== null;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{product.title}</span>
                        {product.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {isDigital ? (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          Digital
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          Physical
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {CURRENCY_INFO[product.currency as Currency || 'USD'].symbol}
                      {product.price.toLocaleString()} {product.currency || 'USD'}
                    </TableCell>
                    <TableCell>
                      {isDigital ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          N/A
                        </Badge>
                      ) : hasStock ? (
                        <Badge
                          variant={product.stock_quantity! > 10 ? "default" : product.stock_quantity! > 0 ? "secondary" : "destructive"}
                        >
                          {product.stock_quantity} in stock
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Out of Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(product)}>
                            {product.is_active ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </motion.div>
    </div>
  );
}

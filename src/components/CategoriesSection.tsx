import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  BookOpen, 
  Music, 
  GraduationCap, 
  Utensils, 
  Calendar,
  ArrowRight
} from "lucide-react";

const categories = [
  {
    id: "products",
    title: "Products",
    description: "Sell clothes, perfumes, home appliances, and kitchenware with ease.",
    icon: ShoppingBag,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "books",
    title: "Books & E-Books",
    description: "Publish and sell digital or printed books to readers worldwide.",
    icon: BookOpen,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    id: "creators",
    title: "Creators & Artists",
    description: "Musicians, content creators, and artisans can monetize their craft.",
    icon: Music,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "courses",
    title: "Online Courses",
    description: "Create video courses and host live classes for students globally.",
    icon: GraduationCap,
    gradient: "from-amber-500 to-yellow-500",
  },
  {
    id: "services",
    title: "Restaurants & Lodging",
    description: "Manage menus, bookings, and reservations seamlessly.",
    icon: Utensils,
    gradient: "from-blue-500 to-sky-500",
  },
  {
    id: "events",
    title: "Events & Media",
    description: "Organize events, sell tickets, and publish news content.",
    icon: Calendar,
    gradient: "from-emerald-500 to-teal-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function CategoriesSection() {
  return (
    <section id="products" className="relative bg-white dark:bg-slate-950 py-16 lg:py-20">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl">
            Shop by Category
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Browse products organized by category for easy shopping
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {categories.map((category) => (
            <motion.div
              key={category.id}
              variants={itemVariants}
              className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient}`}
              >
                <category.icon className="h-6 w-6 text-white" />
              </div>
              
              <h3 className="text-xl font-semibold text-foreground">{category.title}</h3>
              <p className="mt-2 text-muted-foreground">{category.description}</p>
              
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Learn more <ArrowRight className="h-4 w-4" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

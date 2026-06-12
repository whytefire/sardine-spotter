"use client";

import { motion } from "framer-motion";
import {
  MapPin,
  Bell,
  Camera,
  Shield,
  Smartphone,
  Users,
  Fish,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: MapPin,
    title: "Live Sighting Map",
    description:
      "See exactly where sardines have been spotted on an interactive map. Filter by distance and time to find sightings near you.",
    gradient: "from-ocean-500 to-ocean-600",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description:
      "Get alerted the moment someone spots sardines within your chosen radius. Set your range from 1km to 2,000km.",
    gradient: "from-coral-500 to-sunset-500",
  },
  {
    icon: Camera,
    title: "Photo Reports",
    description:
      "Upload photos of what you see. Help the community verify sightings and build a real-time picture of the run.",
    gradient: "from-sea-green-500 to-ocean-500",
  },
  {
    icon: Fish,
    title: "Track the Migration",
    description:
      "Follow the sardine run as it moves along the KZN coast from May to July. Watch patterns emerge in real-time.",
    gradient: "from-ocean-600 to-ocean-800",
  },
  {
    icon: Users,
    title: "Community Powered",
    description:
      "Join thousands of sardine spotters along the coast. The more people report, the better it works for everyone.",
    gradient: "from-ocean-400 to-ocean-600",
  },
  {
    icon: Shield,
    title: "Your Data is Safe",
    description:
      "We encrypt your information and never sell your data. We only use your location to show you nearby sightings.",
    gradient: "from-deep-950 to-ocean-900",
  },
  {
    icon: Smartphone,
    title: "Works on Any Device",
    description:
      "Install the app on your phone straight from the browser. No app store needed — works on Android and iPhone.",
    gradient: "from-coral-400 to-coral-600",
  },
  {
    icon: Zap,
    title: "Real-Time Updates",
    description:
      "Sightings appear within seconds of being reported. The 24-hour rolling feed keeps everything fresh and relevant.",
    gradient: "from-sunset-500 to-coral-500",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Features() {
  return (
    <section
      className="py-24 bg-white dark:bg-deep-950"
      id="features"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-ocean-500 font-semibold tracking-wide uppercase text-sm"
          >
            Everything you need
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-3 text-4xl sm:text-5xl font-display font-bold text-deep-950 dark:text-white tracking-tight"
          >
            Sardine spotting,{" "}
            <span className="gradient-text">simplified</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-lg text-deep-950/60 dark:text-ocean-200/70 max-w-2xl mx-auto"
          >
            No more waiting around to hear that sardines were spotted near you hours ago.
            Get the information in real-time, straight from the community.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="card-elevated group relative p-6 rounded-2xl bg-deep-50 dark:bg-white/5 border border-ocean-100/50 dark:border-white/10 hover:border-ocean-200 dark:hover:border-ocean-500/30 transition-all duration-300"
            >
              <div
                className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-deep-950 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-deep-950/60 dark:text-ocean-200/60 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

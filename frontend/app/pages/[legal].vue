
<script setup lang="ts">
const route = useRoute()

const pages: Record<string, {
  title: string
  subtitle: string
  sections: { title: string; paragraphs: string[] }[]
}> = {
  'mentions-legales': {
    title: 'Mentions légales',
    subtitle: 'Informations relatives à l’édition et à l’hébergement de Spot.',
    sections: [
      {
        title: 'Éditeur du service',
        paragraphs: [
          'Spot est une application web de suivi d’entraînement sportif.',
          'Éditeur : FASQUEL WILLARD Nathan',
          'Adresse de contact : nathan.fasquelw@gmail.com',
          'Adresse postale : 2 rue henri lefebvre, 62100, Calais, France',
          'Directeur de la publication : FASQUEL WILLARD Nathan',
        ],
      },
      {
        title: 'Hébergement',
        paragraphs: [
          'Le service est hébergé par OVHcloud.',
          'OVH SAS — 2 rue Kellermann, 59100 Roubaix, France.',
          'Site : https://www.ovhcloud.com/',
        ],
      },
      {
        title: 'Propriété intellectuelle',
        paragraphs: [
          'Le code, les textes, les éléments graphiques et les autres contenus de Spot sont soumis aux droits de leurs titulaires respectifs.',
          'Les images et animations d’exercices éventuellement présentées sur le service peuvent appartenir à des tiers et nécessiter une autorisation spécifique de réutilisation.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          'Pour toute question relative au service ou à ses contenus : nathan.fasquelw@gmail.com',
        ],
      },
    ],
  },

  confidentialite: {
    title: 'Politique de confidentialité',
    subtitle: 'Comment Spot traite les données personnelles de ses utilisateurs.',
    sections: [
      {
        title: 'Responsable du traitement',
        paragraphs: [
          'Le responsable du traitement des données est FASQUEL WILLARD Nathan.',
          'Contact : nathan.fasquelw@gmail.com.',
        ],
      },
      {
        title: 'Données traitées',
        paragraphs: [
          'Selon les fonctionnalités utilisées, Spot peut traiter les informations de compte, les identifiants de connexion, les séances d’entraînement, les exercices, les séries, les répétitions, les charges et les données de profil.',
          'Si les fonctionnalités sociales sont activées, les publications, commentaires et interactions peuvent également être traités.',
          'Des informations techniques nécessaires à la sécurité du service, comme les adresses IP et les journaux de connexion, peuvent être enregistrées.',
          'Cette liste doit être adaptée aux données réellement collectées.',
        ],
      },
      {
        title: 'Finalités et bases légales',
        paragraphs: [
          'Les données nécessaires au compte et au suivi des entraînements sont traitées pour fournir les fonctionnalités demandées par l’utilisateur, sur la base de l’exécution des conditions d’utilisation.',
          'Certaines données techniques peuvent être traitées pour assurer la sécurité du service, sur la base de l’intérêt légitime du responsable du traitement.',
          'Les traitements facultatifs, notamment certains traceurs de statistiques ou de publicité, sont soumis au consentement lorsqu’il est requis.',
        ],
      },
      {
        title: 'Destinataires et hébergement',
        paragraphs: [
          'Les données sont accessibles aux personnes et prestataires qui en ont besoin pour exploiter et sécuriser Spot.',
          'L’infrastructure est hébergée auprès d’OVHcloud. Les autres prestataires éventuels doivent être indiqués ici.',
          'Tout transfert de données en dehors de l’Espace économique européen doit être identifié et encadré conformément au RGPD.',
        ],
      },
      {
        title: 'Durées de conservation',
        paragraphs: [
          'Les données de compte et d’entraînement sont conservées pendant l’utilisation du compte, puis supprimées ou anonymisées selon les délais applicables.',
          'Les délais précis de suppression, de sauvegarde et de conservation des journaux techniques doivent être définis et indiqués avant la publication.',
        ],
      },
      {
        title: 'Vos droits',
        paragraphs: [
          'Conformément au RGPD, vous disposez, selon les circonstances, de droits d’accès, de rectification, d’effacement, de limitation, de portabilité et d’opposition.',
          'Vous pouvez exercer vos droits à l’adresse nathan.fasquelw@gmail.com.',
          'Vous pouvez également introduire une réclamation auprès de la CNIL : https://www.cnil.fr/.',
        ],
      },
      {
        title: 'Sécurité et visibilité',
        paragraphs: [
          'Spot met en œuvre des mesures techniques et organisationnelles adaptées pour protéger les données personnelles.',
          'Les données rendues publiques par les fonctionnalités sociales peuvent être visibles par les autres utilisateurs selon les paramètres de confidentialité du service.',
        ],
      },
    ],
  },

  cookies: {
    title: 'Politique de cookies',
    subtitle: 'Informations sur les cookies et technologies similaires.',
    sections: [
      {
        title: 'Qu’est-ce qu’un cookie ?',
        paragraphs: [
          'Un cookie est une information enregistrée sur votre appareil lors de l’utilisation d’un site ou d’une application web.',
        ],
      },
      {
        title: 'Cookies nécessaires',
        paragraphs: [
          'Spot peut utiliser des cookies techniques pour maintenir une session authentifiée, sécuriser les requêtes et assurer le fonctionnement des fonctionnalités demandées.',
          'Ces cookies peuvent être exemptés de consentement lorsqu’ils sont strictement nécessaires.',
        ],
      },
      {
        title: 'Cookies facultatifs',
        paragraphs: [
          'Les éventuels cookies de statistiques, de publicité ou de services tiers soumis au consentement ne doivent être activés qu’après un choix positif de l’utilisateur.',
          'La liste exacte des traceurs, leurs fournisseurs, leurs finalités et leurs durées doit être renseignée avant leur activation.',
        ],
      },
      {
        title: 'Gérer vos préférences',
        paragraphs: [
          'Lorsque Spot utilise des traceurs facultatifs soumis au consentement, vous pouvez les accepter, les refuser et modifier votre choix à tout moment depuis le gestionnaire de cookies.',
          'Le refus des cookies facultatifs ne doit pas empêcher l’utilisation des fonctionnalités essentielles du service.',
        ],
      },
    ],
  },

  cgu: {
    title: 'Conditions générales d’utilisation',
    subtitle: 'Les règles applicables à l’utilisation de Spot.',
    sections: [
      {
        title: 'Objet',
        paragraphs: [
          'Spot propose des fonctionnalités de création, de suivi et de consultation de séances d’entraînement sportif, ainsi que des fonctionnalités sociales lorsqu’elles sont disponibles.',
        ],
      },
      {
        title: 'Compte utilisateur',
        paragraphs: [
          'L’utilisateur s’engage à fournir des informations exactes, à protéger ses identifiants et à ne pas utiliser le compte d’une autre personne sans autorisation.',
        ],
      },
      {
        title: 'Utilisation du service',
        paragraphs: [
          'Il est interdit de perturber le fonctionnement du service, d’accéder sans autorisation à des données ou comptes, ou de publier des contenus illicites.',
          'L’utilisateur reste responsable des contenus qu’il publie et doit respecter les droits des autres personnes.',
        ],
      },
      {
        title: 'Informations sportives',
        paragraphs: [
          'Les démonstrations et informations relatives aux exercices sont fournies à titre informatif et ne remplacent pas un avis médical ou un accompagnement professionnel adapté.',
        ],
      },
      {
        title: 'Disponibilité et modifications',
        paragraphs: [
          'Spot peut évoluer, notamment pour des raisons de maintenance, de sécurité ou d’amélioration du service.',
          'Les utilisateurs seront informés des modifications importantes lorsque cela est nécessaire.',
        ],
      },
      {
        title: 'Suspension et suppression',
        paragraphs: [
          'Des mesures proportionnées peuvent être prises en cas d’utilisation abusive ou de violation des présentes conditions.',
          'L’utilisateur peut demander la suppression de son compte selon la procédure décrite sur la page dédiée.',
        ],
      },
      {
        title: 'Contact',
        paragraphs: [
          'Pour toute question concernant ces conditions : nathan.fasquelw@gmail.com.',
        ],
      },
    ],
  },

  'suppression-compte': {
    title: 'Suppression de compte',
    subtitle: 'Comment demander la suppression de votre compte Spot.',
    sections: [
      {
        title: 'Demander une suppression',
        paragraphs: [
          'Pour demander la suppression de votre compte, contactez nathan.fasquelw@gmail.com depuis l’adresse associée à votre compte.',
          'Si une fonction de suppression est disponible dans les paramètres de votre compte, vous pouvez également l’utiliser directement.',
        ],
      },
      {
        title: 'Conséquences',
        paragraphs: [
          'La suppression entraîne la fermeture du compte et la suppression ou l’anonymisation des données associées, sous réserve des obligations légales et des délais techniques applicables.',
          'Certaines données peuvent rester temporairement présentes dans les sauvegardes sécurisées jusqu’à leur expiration.',
        ],
      },
      {
        title: 'Exercice de vos droits',
        paragraphs: [
          'Vous pouvez également demander l’accès, la rectification ou l’effacement de vos données à nathan.fasquelw@gmail.com.',
        ],
      },
    ],
  },
}

const page = computed(() => pages[String(route.params.legal)])

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page introuvable' })
}

useSeoMeta({
  title: () => `${page.value?.title ?? 'Informations légales'} — Spot`,
  description: () => page.value?.subtitle ?? '',
})
</script>

<template>
  <main class="min-h-screen bg-[#0B1018] px-5 py-12 text-white sm:py-20">
    <div class="mx-auto max-w-3xl">
      <NuxtLink
        to="/"
        class="mb-10 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-lime-300"
      >
        <span aria-hidden="true">←</span>
        Retour à Spot
      </NuxtLink>

      <div class="mb-12">
        <span class="mb-4 inline-block rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-300">
          Informations légales
        </span>

        <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">
          {{ page?.title }}
        </h1>

        <p class="mt-4 text-base leading-7 text-slate-400">
          {{ page?.subtitle }}
        </p>

        <p class="mt-4 text-xs text-slate-500">
          Dernière mise à jour : 23 octobre 2026
        </p>
      </div>

      <div class="space-y-5">
        <section
          v-for="(section, index) in page?.sections"
          :key="index"
          class="rounded-2xl border border-white/10 bg-[#141D29] p-6 sm:p-8"
        >
          <h2 class="mb-4 text-lg font-semibold text-white">
            <span class="mr-2 text-lime-300">
              {{ String(index + 1).padStart(2, '0') }}.
            </span>
            {{ section.title }}
          </h2>

          <p
            v-for="(paragraph, paragraphIndex) in section.paragraphs"
            :key="paragraphIndex"
            class="mb-3 break-words text-sm leading-7 text-slate-300 last:mb-0"
          >
            {{ paragraph }}
          </p>
        </section>
      </div>

      <footer class="mt-12 border-t border-white/10 pt-6">
        <nav aria-label="Informations légales" class="flex flex-wrap gap-x-5 gap-y-3 text-xs text-slate-400">
          <NuxtLink to="/mentions-legales" class="hover:text-lime-300">Mentions légales</NuxtLink>
          <NuxtLink to="/confidentialite" class="hover:text-lime-300">Confidentialité</NuxtLink>
          <NuxtLink to="/cookies" class="hover:text-lime-300">Cookies</NuxtLink>
          <NuxtLink to="/cgu" class="hover:text-lime-300">CGU</NuxtLink>
          <NuxtLink to="/suppression-compte" class="hover:text-lime-300">Suppression du compte</NuxtLink>
        </nav>
      </footer>
    </div>
  </main>
</template>

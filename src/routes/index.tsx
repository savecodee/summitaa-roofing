import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { ServiceValue } from '../config/site'
import { Header } from '../components/site/Header'
import { Hero, TrustStrip } from '../components/site/Hero'
import { Services } from '../components/site/Services'
import { WhyChooseUs } from '../components/site/WhyChooseUs'
import { Process } from '../components/site/Process'
import { ServiceAreas } from '../components/site/ServiceAreas'
import { Financing } from '../components/site/Financing'
import { Pricing } from '../components/site/Pricing'
import { EstimateSection } from '../components/site/EstimateForm'
import { Faq } from '../components/site/Faq'
import { Contact, Footer } from '../components/site/ContactFooter'

export const Route = createFileRoute('/')({
  component: Home,
})

type ServiceRequest = {
  value: ServiceValue
  id: number
}

function Home() {
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest>({
    value: '',
    id: 0,
  })

  const requestService = (value: ServiceValue) => {
    setServiceRequest((current) => ({ value, id: current.id + 1 }))
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:border focus:border-copper focus:bg-ink focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-cream"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main">
        <Hero />
        <TrustStrip />
        <Services onRequestService={requestService} />
        <WhyChooseUs />
        <Process />
        <ServiceAreas />
        <Financing onRequestService={requestService} />
        <Pricing onRequestService={requestService} />
        <EstimateSection
          preselectedService={serviceRequest.value}
          selectionId={serviceRequest.id}
        />
        <Faq />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

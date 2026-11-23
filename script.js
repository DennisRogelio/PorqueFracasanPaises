"use strict";

/* ==========================================================================
   Por qué fracasan los países · Simulador de instituciones
   Juego educativo en JavaScript puro (sin librerías, sin conexión).
   Organización del archivo:
     1. Configuración y reglas del juego
     2. Situaciones (contenido educativo)
     3. Utilidades
     4. Lógica pura (cálculo de efectos, círculos, derrota y final)
     5. Interfaz: panel de indicadores
     6. Interfaz: situaciones y resultados
     7. Interfaz: pantallas finales
     8. Arranque
   ========================================================================== */


/* ==========================================================================
   1. CONFIGURACIÓN Y REGLAS DEL JUEGO
   ========================================================================== */

/** Indicadores que se muestran como barras (en el orden del panel). */
const INDICATORS = [
  { key: "eco",  icon: "📈", name: "Economía",            hint: "Producción, empleo e inversión" },
  { key: "bien", icon: "🏥", name: "Bienestar social",    hint: "Salud, vivienda y calidad de vida" },
  { key: "edu",  icon: "📚", name: "Educación",           hint: "Acceso a escuelas y a la formación" },
  { key: "ig",   icon: "⚖️", name: "Igualdad",            hint: "Reparto de la riqueza y de las oportunidades" },
  { key: "est",  icon: "🏛️", name: "Estabilidad política", hint: "Gobernabilidad y ausencia de conflictos graves" },
  { key: "conf", icon: "🤝", name: "Confianza ciudadana", hint: "Fe de la gente en las autoridades y en la ley" }
];

/** Indicador especial: qué tan inclusivas son las instituciones del país. */
const INSTITUTIONS = {
  key: "inst", icon: "🏗️", name: "Instituciones inclusivas",
  hint: "Poder repartido, ley para todos y oportunidades abiertas"
};

/** Todas las claves y un acceso rápido a sus nombres e iconos. */
const ALL_KEYS = [...INDICATORS.map((item) => item.key), INSTITUTIONS.key];
const LABELS = Object.fromEntries([...INDICATORS, INSTITUTIONS].map((item) => [item.key, item]));

/** Valores con los que empieza cualquier país (0 a 100). */
const START_STATS = { eco: 50, bien: 45, edu: 40, ig: 40, est: 55, conf: 50, inst: 40 };

/** Reglas de victoria, derrota y círculos institucionales. */
const RULES = {
  maxHarmful: 4,        // con 4 decisiones extractivas el país fracasa
  collapseAt: 10,       // un indicador clave en 10 o menos provoca el colapso
  win: { eco: 60, bien: 60, inst: 65, minOthers: 40 },
  virtuousAt: 65,       // instituciones >= 65 activan el círculo virtuoso
  viciousAt: 30         // instituciones <= 30 activan el círculo vicioso
};

/** Tipos de decisión: se revelan solo después de elegir. */
const DECISION_TYPES = {
  inclusive:  { label: "Decisión inclusiva",  icon: "🌱", tone: "good" },
  mixed:      { label: "Decisión intermedia", icon: "⚖️", tone: "mid" },
  extractive: { label: "Decisión extractiva", icon: "⛓️", tone: "bad" }
};

/** Círculos del libro: las instituciones tienden a reforzarse a sí mismas. */
const CYCLES = {
  virtuous: {
    icon: "🔄", title: "Círculo virtuoso",
    effects: { eco: 2, est: 2, conf: 2 },
    text: "Tus instituciones inclusivas se refuerzan a sí mismas: la confianza y la estabilidad crecen y la economía se beneficia."
  },
  vicious: {
    icon: "🌀", title: "Círculo vicioso",
    effects: { est: -2, conf: -3, ig: -2 },
    text: "Tus instituciones extractivas se refuerzan a sí mismas: crece la desconfianza y la desigualdad se profundiza."
  }
};

/** Causas de colapso según el indicador que se desploma. */
const COLLAPSES = {
  eco:  { title: "Colapso económico", text: "La economía se hundió: sin incentivos para invertir ni innovar, las empresas cerraron y el empleo desapareció." },
  bien: { title: "Crisis social", text: "Los servicios básicos dejaron de funcionar y la pobreza se disparó. Casi nadie podía sostener una vida digna." },
  est:  { title: "Colapso político", text: "El gobierno perdió el control: protestas, golpes y luchas por el poder dejaron al país sin rumbo." },
  conf: { title: "Ruptura de la confianza", text: "Nadie creía ya en las autoridades ni en las leyes. Las protestas y la evasión de impuestos paralizaron el país." },
  inst: { title: "Instituciones capturadas", text: "Las reglas terminaron al servicio de una élite reducida. Sin límites al poder, el Estado dejó de trabajar para la mayoría." }
};

/** Causa de colapso por acumular decisiones extractivas. */
const HARMFUL_COLLAPSE = {
  title: "Una élite se apoderó del país",
  text: "Acumulaste demasiadas decisiones extractivas. El poder y la riqueza quedaron en pocas manos y la mayoría perdió la esperanza de mejorar su vida."
};

/** Informe del gabinete: un mensaje cambia según el estado del país. */
const BRIEFING = {
  low: {
    eco:  "Las empresas cierran y la inversión se ha frenado.",
    bien: "Los hospitales están saturados y la pobreza crece.",
    edu:  "Muchos jóvenes abandonan la escuela y faltan trabajadores capacitados.",
    ig:   "La brecha entre ricos y pobres es cada vez más visible.",
    est:  "Las tensiones políticas aumentan y el gobierno se siente frágil.",
    conf: "La gente desconfía de las autoridades y de las instituciones.",
    inst: "Las reglas favorecen a unos pocos y casi nadie cree en ellas."
  },
  high: {
    eco:  "La economía crece y aparecen nuevas empresas.",
    bien: "Las familias viven mejor y los servicios públicos funcionan.",
    edu:  "Más jóvenes estudian y surgen ideas nuevas.",
    ig:   "Las oportunidades se reparten mejor entre regiones y familias.",
    est:  "El sistema político se percibe firme y previsible.",
    conf: "La ciudadanía confía en que su voz cuenta.",
    inst: "Las reglas se aplican a todos y el poder tiene límites."
  }
};

/** Textos de la pantalla de victoria (la reflexión se muestra tal cual). */
const WIN_TITLE = "¡Felicidades! Has construido un país con mejores oportunidades";
const WIN_REFLECTION =
  "El libro Por qué fracasan los países, de Daron Acemoglu y James Robinson, me hizo reflexionar sobre cómo las instituciones y las decisiones políticas influyen en el desarrollo de una nación. Comprendí que la pobreza no depende únicamente de la geografía o los recursos naturales, sino también de las oportunidades que tienen las personas y de cómo se distribuye el poder. Considero que para que un país prospere es importante contar con instituciones justas que permitan a sus ciudadanos desarrollarse y aprovechar sus capacidades.";
const WIN_FINAL_MESSAGE =
  "Las instituciones inclusivas no aparecen por casualidad ni duran para siempre: se construyen con reglas justas, se defienden con participación ciudadana y se renuevan con decisiones valientes. Antes de cerrar, piensa en tu comunidad, tu escuela o tu país: ¿quién tiene voz? ¿Quién puede estudiar, emprender y exigir cuentas? ¿Qué podrías hacer tú para que más personas tengan esas oportunidades?";


/* ==========================================================================
   2. SITUACIONES (contenido educativo)
   Cada opción tiene:
     - tipo: "inclusive" | "mixed" | "extractive"
     - efectos: cambios en los indicadores (positivos o negativos)
     - consecuencia: qué ocurre después de elegirla
     - libro: concepto y explicación relacionados con el libro
   ========================================================================== */

const SCENARIOS = [
  {
    id: "riqueza",
    tema: "Distribución de la riqueza",
    icon: "💎",
    titulo: "El tesoro bajo la montaña",
    texto: "Unos geólogos descubrieron un enorme yacimiento de diamantes en el norte del país. Será la mayor fuente de ingresos en décadas. Varias familias poderosas ya pidieron una reunión privada con tu gobierno. ¿Quién se beneficiará de esta riqueza?",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Entregar la explotación en exclusiva a las familias poderosas a cambio de su apoyo político.",
        resumen: "Yacimiento entregado a las familias poderosas",
        efectos: { eco: 6, bien: -2, ig: -10, est: 3, conf: -6, inst: -9 },
        consecuencia: "Los ingresos llegan rápido, pero terminan en pocas manos. La élite te apoya mientras la mayoría ve pasar la riqueza sin recibir nada.",
        libro: {
          concepto: "Instituciones económicas extractivas",
          texto: "Según Acemoglu y Robinson, en estas instituciones una élite se apropia de los recursos de la sociedad. Genera riqueza para pocos y debilita los incentivos del resto para esforzarse e invertir."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Crear una empresa pública con reglas transparentes y destinar una parte fija de las ganancias a salud, escuelas y caminos.",
        resumen: "Empresa pública transparente con ingresos para todos",
        efectos: { eco: 5, bien: 7, edu: 3, ig: 5, est: 2, conf: 4, inst: 8 },
        consecuencia: "Las ganancias se convierten en hospitales, escuelas y caminos. Las familias poderosas protestan, pero la ciudadanía comprueba que la riqueza también le pertenece.",
        libro: {
          concepto: "El caso de Botswana",
          texto: "Botswana descubrió diamantes poco después de su independencia. Gracias a instituciones que limitaban el poder de las élites, la riqueza se administró de forma que beneficiara a la sociedad y el país creció durante décadas."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Abrir una licitación pública a empresas nacionales y extranjeras, con impuestos claros pero sin destinar los ingresos a nada en particular.",
        resumen: "Licitación abierta sin destino social definido",
        efectos: { eco: 7, bien: 2, ig: 1, conf: 1, inst: 3 },
        consecuencia: "Llega la inversión y la economía se acelera. Como los ingresos no tienen un destino claro, los beneficios sociales son modestos y dependen de cada gobierno.",
        libro: {
          concepto: "Los recursos no bastan",
          texto: "Tener recursos naturales no garantiza la prosperidad. Para los autores, lo decisivo es quién controla la riqueza y bajo qué reglas se administra."
        }
      }
    ]
  },
  {
    id: "educacion",
    tema: "Acceso a la educación",
    icon: "📚",
    titulo: "Escuelas para pocos",
    texto: "Las mejores escuelas del país están en la capital y solo las pagan las familias ricas. En el campo, muchos niños dejan de estudiar a los 11 años para trabajar. El ministro de Educación te pide definir hacia dónde irá el presupuesto.",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Mantener el sistema actual y financiar sobre todo la universidad de élite, que forma a los futuros dirigentes.",
        resumen: "Educación de calidad solo para la élite",
        efectos: { eco: 2, bien: -2, edu: -6, ig: -7, est: 1, conf: -3, inst: -6 },
        consecuencia: "El presupuesto se mantiene tranquilo, pero la brecha crece. Los hijos de la élite heredan las oportunidades y los del campo heredan la pobreza.",
        libro: {
          concepto: "Círculo vicioso",
          texto: "Cuando pocos acceden a las oportunidades, la desigualdad se reproduce de generación en generación. Los autores explican que las instituciones extractivas tienden a perpetuarse a sí mismas."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Crear una escuela pública gratuita para todos, con becas y docentes bien pagados en las zonas rurales.",
        resumen: "Escuela pública universal con becas rurales",
        efectos: { eco: -4, bien: 4, edu: 12, ig: 7, est: 1, conf: 4, inst: 7 },
        consecuencia: "Al principio cuesta caro y la economía lo resiente. Con el tiempo, miles de jóvenes acceden a estudios y empiezan a surgir ideas desde lugares inesperados.",
        libro: {
          concepto: "Talento para todos",
          texto: "Las instituciones inclusivas permiten que las personas desarrollen y usen su talento sin importar su origen. Una sociedad con más ideas y más capacidades tiene muchas más posibilidades de innovar y prosperar."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Invertir solo en escuelas técnicas ligadas a las empresas que ya existen.",
        resumen: "Escuelas técnicas para las industrias existentes",
        efectos: { eco: 4, bien: 1, edu: 5, ig: 1, inst: 1 },
        consecuencia: "Los egresados encuentran empleo pronto y la economía se beneficia. Aun así, quienes viven lejos de esas industrias siguen quedando fuera.",
        libro: {
          concepto: "Educación con límites",
          texto: "Formar trabajadores ayuda, pero no basta. Para los autores, también importa que todos puedan usar sus capacidades en la economía y en la vida pública."
        }
      }
    ]
  },
  {
    id: "corrupcion",
    tema: "Corrupción",
    icon: "🕵️",
    titulo: "El maletín en el ministerio",
    texto: "Un diario revela que un ministro muy cercano a ti desvió dinero de una obra pública. Las pruebas son sólidas. Tu partido te pide que lo protejas; la oposición exige una investigación independiente.",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Negar las acusaciones y frenar la investigación para proteger al gobierno.",
        resumen: "Escándalo encubierto",
        efectos: { eco: -2, bien: -1, ig: -3, est: 3, conf: -10, inst: -9 },
        consecuencia: "La noticia se apaga por un tiempo, pero la gente entiende el mensaje: los poderosos no rinden cuentas. La confianza en las autoridades se rompe.",
        libro: {
          concepto: "Poder sin rendición de cuentas",
          texto: "En las instituciones extractivas, quienes gobiernan están por encima de la ley y usan el Estado en beneficio propio. Sin límites al poder, los abusos se repiten."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Entregar el caso a jueces independientes y publicar los resultados, aunque perjudique a tu partido.",
        resumen: "Jueces independientes investigan al ministro",
        efectos: { eco: 1, ig: 2, est: -4, conf: 9, inst: 10 },
        consecuencia: "Es un golpe doloroso para tu partido y la estabilidad tiembla unos días. Pero el país aprende que la ley también se aplica a quienes gobiernan.",
        libro: {
          concepto: "Estado de derecho",
          texto: "La Revolución Gloriosa de 1688 limitó el poder de la corona inglesa y fortaleció al Parlamento. Cuando el poder tiene límites y la ley vale para todos, se abre el camino a instituciones más inclusivas."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Destituir al ministro en silencio, sin investigación ni explicaciones públicas.",
        resumen: "Ministro destituido sin investigación",
        efectos: { est: 1, conf: -2, inst: -1 },
        consecuencia: "El problema desaparece de los titulares, pero nadie sabe cuánto se robó ni si el sistema permite que ocurra otra vez.",
        libro: {
          concepto: "Reformas superficiales",
          texto: "Cambiar a una persona sin cambiar las reglas deja intacto el problema de fondo. Lo que importa son las instituciones que permiten o impiden el abuso, más que quién ocupa el cargo."
        }
      },
      {
        id: "d",
        tipo: "mixed",
        texto: "Crear una comisión anticorrupción cuyos miembros nombrará el presidente.",
        resumen: "Comisión anticorrupción dependiente del presidente",
        efectos: { est: 2, conf: -1, inst: -2 },
        consecuencia: "Parece una solución seria, pero todos saben quién manda sobre la comisión. La gente espera para ver si investigará también a los aliados del presidente.",
        libro: {
          concepto: "Instituciones de fachada",
          texto: "Un organismo que depende de quien debería ser vigilado no controla el poder: solo lo aparenta. Para que funcione, el poder debe estar repartido y tener contrapesos reales."
        }
      }
    ]
  },
  {
    id: "libertades",
    tema: "Derechos y libertades",
    icon: "📰",
    titulo: "La prensa incómoda",
    texto: "Un grupo de periodistas publica reportajes sobre abusos de autoridades locales. Los medios independientes crecen y las asociaciones civiles se multiplican. Algunos de tus aliados quieren frenarlos. ¿Cómo tratas a quienes critican al poder?",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Exigir licencias oficiales para publicar y cerrar los medios críticos.",
        resumen: "Censura y licencias para los medios",
        efectos: { eco: -1, bien: -1, ig: -2, est: 4, conf: -6, inst: -8 },
        consecuencia: "Las críticas desaparecen de la vista, pero se instala el miedo. Quienes ven abusos ya no se atreven a denunciarlos y los problemas se acumulan.",
        libro: {
          concepto: "Sin voz no hay pluralismo",
          texto: "Las instituciones políticas inclusivas reparten el poder entre muchos actores y les permiten ser escuchados. Cuando se silencia a la ciudadanía, el poder se concentra en pocas manos."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Garantizar por ley la libertad de prensa y de asociación, y protegerlas de presiones oficiales.",
        resumen: "Libertad de prensa y de asociación garantizadas",
        efectos: { eco: 2, bien: 1, ig: 3, est: -2, conf: 6, inst: 9 },
        consecuencia: "Tu gobierno recibe críticas incómodas, pero también información para corregir errores. La sociedad se organiza y participa más.",
        libro: {
          concepto: "Pluralismo",
          texto: "El pluralismo, es decir, que el poder esté repartido entre muchos grupos y no en una sola élite, es una de las características de las instituciones políticas inclusivas. La otra es un Estado capaz de hacer cumplir la ley."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Permitir los medios, pero con una ley que castigue las noticias «perjudiciales para el orden público».",
        resumen: "Prensa permitida pero vigilada por ley",
        efectos: { ig: -1, est: 2, conf: -2, inst: -3 },
        consecuencia: "Nadie cierra periódicos, pero los reporteros calculan con cuidado lo que publican. La libertad existe en el papel y se debilita en la práctica.",
        libro: {
          concepto: "Derechos que no protegen",
          texto: "Para los autores, los derechos solo importan si las instituciones los protegen de verdad. Si quien manda decide qué se puede decir, el poder sigue sin controles."
        }
      }
    ]
  },
  {
    id: "participacion",
    tema: "Participación ciudadana",
    icon: "🗳️",
    titulo: "Voces que piden ser escuchadas",
    texto: "Miles de personas marchan en la capital para exigir que se les consulte sobre las decisiones importantes. Tu partido siempre ha gobernado sin competencia real. Es momento de decidir cuánto poder estás dispuesto a compartir.",
    opciones: [
      {
        id: "a",
        tipo: "inclusive",
        texto: "Convocar elecciones libres y competitivas, y dar a los municipios presupuestos que decidan los propios vecinos.",
        resumen: "Elecciones libres y presupuestos participativos",
        efectos: { eco: 1, bien: 2, ig: 3, est: -3, conf: 7, inst: 9 },
        consecuencia: "Perder el control absoluto asusta a tu partido, pero mucha gente vuelve a creer en el sistema. Las decisiones locales empiezan a reflejar necesidades reales.",
        libro: {
          concepto: "Participación amplia",
          texto: "Para Acemoglu y Robinson, las instituciones políticas inclusivas distribuyen el poder de forma amplia. Cuando el poder se comparte, los gobiernos tienen incentivos para atender a la mayoría y no solo a unos pocos."
        }
      },
      {
        id: "b",
        tipo: "extractive",
        texto: "Organizar elecciones y consultas en las que participe únicamente el partido oficial.",
        resumen: "Elecciones sin competencia real",
        efectos: { est: 4, ig: -2, conf: -5, inst: -8 },
        consecuencia: "Votar se vuelve un trámite: el resultado ya se conoce. La gente deja de participar y el descontento se acumula bajo la superficie.",
        libro: {
          concepto: "Votar no basta",
          texto: "Unas elecciones sin competencia real no reparten el poder. Para los autores, la apariencia de democracia no equivale a tener instituciones inclusivas."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Ampliar el voto poco a poco, empezando solo por quienes poseen tierras o empresas.",
        resumen: "Voto ampliado gradualmente, solo a propietarios",
        efectos: { eco: 2, ig: -2, est: 1, conf: 1, inst: 2 },
        consecuencia: "Más gente participa, pero muchas personas siguen sin voz. Es un avance incompleto, y la presión por ampliarlo no va a desaparecer.",
        libro: {
          concepto: "El caso inglés",
          texto: "En Inglaterra el derecho al voto se amplió por etapas durante el siglo XIX, con las reformas de 1832, 1867 y 1884, impulsadas por la presión de la ciudadanía."
        }
      }
    ]
  },
  {
    id: "innovacion",
    tema: "Oportunidades económicas",
    icon: "💡",
    titulo: "La máquina que asusta a los poderosos",
    texto: "Un artesano inventó una máquina que teje en un día lo que antes tomaba una semana. Podría multiplicar la producción del país, pero dejaría sin trabajo a muchos tejedores. Los gremios y los grandes terratenientes te piden prohibirla.",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Prohibir la máquina para proteger los empleos y los negocios que ya existen.",
        resumen: "Máquina prohibida",
        efectos: { eco: -6, bien: -1, edu: -1, ig: -1, est: 3, conf: -3, inst: -7 },
        consecuencia: "Nadie pierde el empleo hoy, pero el inventor se marcha a otro país con su idea. El país se queda atrás mientras otros se modernizan.",
        libro: {
          concepto: "Destrucción creativa",
          texto: "Schumpeter llamó destrucción creativa al proceso en que lo nuevo reemplaza a lo viejo. Los autores muestran cómo gobernantes de distintas épocas frenaron la innovación por temor a los perdedores del cambio; por ejemplo, la reina Isabel I negó una patente al inventor del telar de medias por miedo al desempleo."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Permitir la máquina y crear seguros de desempleo y cursos de capacitación para los tejedores.",
        resumen: "Innovación permitida con apoyo a los trabajadores",
        efectos: { eco: 9, bien: 3, edu: 4, ig: 2, est: -3, conf: 3, inst: 8 },
        consecuencia: "Aparecen nuevas fábricas y empleos, y los tejedores desplazados reciben apoyo para reincorporarse. El cambio duele, pero se comparte.",
        libro: {
          concepto: "Destrucción creativa",
          texto: "Las instituciones inclusivas permiten la innovación porque ninguna élite tiene el poder de vetarla. Por eso el crecimiento sostenido suele ir acompañado de destrucción creativa."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Permitir la máquina y dejar que el mercado se ajuste solo, sin ayudas.",
        resumen: "Innovación permitida sin apoyo social",
        efectos: { eco: 9, bien: -4, ig: -4, est: -4, conf: -3, inst: 2 },
        consecuencia: "La producción se dispara, pero cientos de tejedores quedan sin ingresos. Crecen la protesta y la desigualdad, aunque la economía avanza.",
        libro: {
          concepto: "Ganadores y perdedores",
          texto: "La destrucción creativa beneficia a unos y perjudica a otros. Cuando los perdedores no tienen voz ni protección, aumenta la resistencia al cambio."
        }
      },
      {
        id: "d",
        tipo: "extractive",
        texto: "Dar la licencia exclusiva de la máquina a un empresario amigo del presidente.",
        resumen: "Licencia exclusiva para un empresario aliado",
        efectos: { eco: 3, ig: -6, est: 2, conf: -5, inst: -8 },
        consecuencia: "El invento llega al mercado, pero un solo empresario cobra por él. Nadie más puede competir ni mejorar la máquina.",
        libro: {
          concepto: "Monopolios y privilegios",
          texto: "Los autores describen cómo los gobernantes extractivos, como los monarcas ingleses de la dinastía Estuardo, concedían monopolios a sus aliados. Así se bloquea la competencia y se enriquece a pocos a costa del resto."
        }
      }
    ]
  },
  {
    id: "poder",
    tema: "Concentración del poder",
    icon: "👑",
    titulo: "Un presidente muy popular",
    texto: "Tu popularidad está en su mejor momento. Tus aliados proponen eliminar el límite de mandatos y designar a los jueces del tribunal supremo para «gobernar sin obstáculos». ¿Aceptas?",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Aceptar: reelección indefinida y control del tribunal supremo.",
        resumen: "Reelección indefinida y tribunal controlado",
        efectos: { eco: 2, ig: -3, est: 5, conf: -8, inst: -12 },
        consecuencia: "Las decisiones son rápidas y sin resistencia, pero ya nadie puede frenar tus errores. Poco a poco, el poder se vuelve más difícil de retirar.",
        libro: {
          concepto: "La ley de hierro de la oligarquía",
          texto: "El libro retoma esta idea de Robert Michels: quienes llegan al poder tienden a consolidarlo y a usarlo en beneficio propio. Los contrapesos existen precisamente para evitarlo."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Rechazar la propuesta y mantener el límite de mandatos y la independencia de los jueces.",
        resumen: "Límites de mandato y jueces independientes",
        efectos: { eco: 1, ig: 2, est: -1, conf: 5, inst: 10 },
        consecuencia: "Tus aliados se decepcionan, pero el país deja de depender de una sola persona. El poder podrá cambiar de manos sin crisis.",
        libro: {
          concepto: "Pluralismo y contrapesos",
          texto: "Con el poder distribuido, ningún gobernante puede usar el Estado como propiedad personal. Las instituciones inclusivas se apoyan en reglas que limitan a quienes gobiernan."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Aceptar un mandato adicional, siempre que lo ratifique el Congreso.",
        resumen: "Un mandato más, con aprobación del Congreso",
        efectos: { est: 2, conf: -1, inst: -2 },
        consecuencia: "Es un compromiso: sigues gobernando y el Congreso conserva algo de control. Pero queda abierto el precedente de cambiar las reglas por conveniencia.",
        libro: {
          concepto: "Reglas a conveniencia",
          texto: "Desde la perspectiva del libro, las reglas pierden valor cuando quienes mandan pueden cambiarlas a su favor. Cada excepción facilita la siguiente."
        }
      }
    ]
  },
  {
    id: "propiedad",
    tema: "Instituciones justas",
    icon: "🌾",
    titulo: "La tierra sin título",
    texto: "Miles de familias campesinas cultivan sus tierras desde hace décadas, pero ninguna tiene un título legal. Los grandes terratenientes empiezan a reclamar esos terrenos y a cobrar rentas abusivas. Los tribunales tardan años y son caros. ¿Qué reglas vas a establecer?",
    opciones: [
      {
        id: "a",
        tipo: "inclusive",
        texto: "Entregar títulos de propiedad a las familias campesinas y crear tribunales rápidos y accesibles para todos.",
        resumen: "Títulos para campesinos y tribunales accesibles",
        efectos: { eco: 6, bien: 4, edu: 1, ig: 8, est: -2, conf: 5, inst: 9 },
        consecuencia: "Con la tierra asegurada, las familias invierten, mejoran sus cultivos y piden créditos. Los terratenientes se quejan, pero la producción crece.",
        libro: {
          concepto: "Derechos de propiedad para todos",
          texto: "Las instituciones económicas inclusivas protegen la propiedad de la gran mayoría y hacen cumplir los contratos. Solo así las personas tienen incentivos para invertir y trabajar más."
        }
      },
      {
        id: "b",
        tipo: "extractive",
        texto: "Proteger solo los derechos de los grandes terratenientes y permitir que desalojen a los campesinos.",
        resumen: "Propiedad protegida solo para grandes terratenientes",
        efectos: { eco: 3, bien: -2, ig: -8, est: 2, conf: -5, inst: -8 },
        consecuencia: "Las grandes fincas producen más por un tiempo, pero miles de familias lo pierden todo. Crece el resentimiento y nadie confía en que la ley proteja lo suyo.",
        libro: {
          concepto: "Propiedad para pocos",
          texto: "Cuando solo la élite tiene derechos seguros, los demás no invierten porque temen perder los frutos de su esfuerzo. Es una de las razones por las que las instituciones extractivas frenan el desarrollo."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Crear un registro de tierras en la capital, con trámites lentos y costosos.",
        resumen: "Registro de tierras centralizado y costoso",
        efectos: { eco: 1, ig: -1, conf: -2, inst: -1 },
        consecuencia: "Formalmente hay una solución, pero pocas familias pueden pagar el viaje y los trámites. El registro termina favoreciendo a quienes ya tienen recursos.",
        libro: {
          concepto: "El caso de Nogales",
          texto: "Nogales (Arizona) y Nogales (Sonora) comparten geografía y raíces culturales, pero no las instituciones. Donde los permisos y los trámites frenan a los emprendedores, la prosperidad se estanca."
        }
      }
    ]
  },
  {
    id: "crisis",
    tema: "Crisis y oportunidad",
    icon: "🌪️",
    titulo: "La gran crisis",
    texto: "El precio de las exportaciones se desploma. Suben el desempleo y los precios, y el presupuesto no alcanza. Las grandes empresas piden un rescate; los sindicatos y los barrios populares piden ayuda. Es una coyuntura crítica: lo que decidas puede cambiar el rumbo del país por mucho tiempo.",
    opciones: [
      {
        id: "a",
        tipo: "extractive",
        texto: "Rescatar a las grandes empresas con dinero público y recortar los programas sociales.",
        resumen: "Rescate a la élite y recorte de programas sociales",
        efectos: { eco: 3, bien: -8, edu: -3, ig: -7, est: -3, conf: -8, inst: -8 },
        consecuencia: "Las grandes empresas sobreviven; las familias no. El malestar crece y la sensación de que «los de arriba» siempre se salvan es difícil de revertir.",
        libro: {
          concepto: "Coyuntura crítica",
          texto: "Un evento que sacude el equilibrio político y económico puede reforzar el poder de una élite o abrir la puerta al cambio. Todo depende de las instituciones existentes y de las decisiones que se tomen en ese momento."
        }
      },
      {
        id: "b",
        tipo: "inclusive",
        texto: "Aplicar una reforma fiscal justa: más impuestos a las grandes fortunas y apoyo directo a quienes perdieron su empleo.",
        resumen: "Reforma fiscal justa y apoyo a desempleados",
        efectos: { eco: 2, bien: 6, edu: 2, ig: 7, est: -2, conf: 5, inst: 7 },
        consecuencia: "Los más ricos protestan, pero los hogares vulnerables reciben ayuda y la economía se estabiliza. La crisis termina fortaleciendo el pacto entre ciudadanos y Estado.",
        libro: {
          concepto: "Cambio institucional",
          texto: "Las coyunturas críticas pueden abrir la puerta a instituciones más inclusivas cuando amplios sectores de la sociedad se coordinan y logran ser escuchados. Los autores subrayan que nada es automático: depende de las decisiones y de la fuerza de esa coalición."
        }
      },
      {
        id: "c",
        tipo: "mixed",
        texto: "Endeudar al país con préstamos externos y posponer las decisiones difíciles.",
        resumen: "Deuda externa y decisiones pospuestas",
        efectos: { eco: 3, est: 1, conf: -2, inst: -1 },
        consecuencia: "La crisis se amortigua por un tiempo. Como no cambia nada de fondo, los problemas quedan esperando al próximo gobierno.",
        libro: {
          concepto: "Deriva institucional",
          texto: "Los autores hablan de deriva institucional: pequeñas diferencias entre sociedades se acumulan con el tiempo. Cada decisión, aun la «menor», empuja al país hacia un camino u otro."
        }
      }
    ]
  }
];


/* ==========================================================================
   3. UTILIDADES
   ========================================================================== */

/** Atajo para buscar un elemento del documento. */
const $ = (selector, root = document) => root.querySelector(selector);

/**
 * Crea un elemento del DOM de forma segura (los textos se insertan como
 * texto, nunca como HTML, así el nombre que escribe el jugador no puede
 * romper la página).
 */
function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === false || value === null || value === undefined) continue;
    if (name === "class") node.className = value;
    else if (name.startsWith("on") && typeof value === "function") node.addEventListener(name.slice(2), value);
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child);
  }
  return node;
}

/** Limita un valor al rango 0 a 100. */
function clamp(value) {
  return Math.min(100, Math.max(0, value));
}

/** Devuelve una copia de la lista en orden aleatorio (Fisher-Yates). */
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Formatea un cambio con signo: +5, −3. */
function signed(value) {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

/** Limpia el nombre del país escrito por el jugador. */
function cleanCountryName(raw) {
  const name = String(raw).replace(/\s+/g, " ").trim().slice(0, 24);
  return name || "Valmora";
}

/** True si el usuario pidió reducir animaciones. */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Desplaza la vista hacia un elemento respetando la preferencia de movimiento. */
function scrollToNode(node, block = "start") {
  node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block });
}


/* ==========================================================================
   4. LÓGICA PURA (no toca el DOM; se puede probar por separado)
   ========================================================================== */

/** Aplica los efectos de una decisión y devuelve los nuevos indicadores. */
function applyEffects(stats, effects) {
  const next = { ...stats };
  for (const [key, delta] of Object.entries(effects)) {
    next[key] = clamp(next[key] + delta);
  }
  return next;
}

/** Diferencia real (ya con el límite 0-100) entre dos estados. */
function diffStats(before, after) {
  const diff = {};
  for (const key of ALL_KEYS) diff[key] = after[key] - before[key];
  return diff;
}

/** Devuelve el círculo activo según las instituciones, o null. */
function cycleFor(stats) {
  if (stats.inst >= RULES.virtuousAt) return "virtuous";
  if (stats.inst <= RULES.viciousAt) return "vicious";
  return null;
}

/** Devuelve la causa de colapso si el país fracasó, o null. */
function collapseFor(stats, harmfulCount) {
  for (const key of Object.keys(COLLAPSES)) {
    if (stats[key] <= RULES.collapseAt) return { ...COLLAPSES[key], key };
  }
  if (harmfulCount >= RULES.maxHarmful) return { ...HARMFUL_COLLAPSE, key: "harmful" };
  return null;
}

/**
 * Resuelve una decisión completa: efectos de la opción, efecto del círculo
 * institucional, conteo de decisiones extractivas y posible colapso.
 */
function resolveDecision(stats, harmfulCount, option) {
  let next = applyEffects(stats, option.efectos);
  const cycle = cycleFor(next);
  if (cycle) next = applyEffects(next, CYCLES[cycle].effects);
  const harmful = harmfulCount + (option.tipo === "extractive" ? 1 : 0);
  return { stats: next, cycle, harmful, collapse: collapseFor(next, harmful) };
}

/**
 * Evalúa el final de la partida (si el país no colapsó):
 *  - "win": equilibrio entre economía, bienestar e instituciones inclusivas
 *  - "growth": economía fuerte con instituciones débiles (crecimiento extractivo)
 *  - "mixed": país a medio camino
 * También devuelve las metas que no se cumplieron.
 */
function evaluateEnding(stats) {
  const goals = RULES.win;
  const unmet = [];
  if (stats.eco < goals.eco) unmet.push({ key: "eco", value: stats.eco, need: goals.eco });
  if (stats.bien < goals.bien) unmet.push({ key: "bien", value: stats.bien, need: goals.bien });
  if (stats.inst < goals.inst) unmet.push({ key: "inst", value: stats.inst, need: goals.inst });
  for (const key of ["edu", "ig", "est", "conf"]) {
    if (stats[key] < goals.minOthers) unmet.push({ key, value: stats[key], need: goals.minOthers });
  }
  if (unmet.length === 0) return { type: "win", unmet };
  const growth = stats.eco >= goals.eco && stats.inst < 50;
  return { type: growth ? "growth" : "mixed", unmet };
}

/** Nivel visual de un indicador: "low", "mid" o "high". */
function levelFor(value) {
  if (value < 30) return "low";
  if (value >= 70) return "high";
  return "mid";
}

/** Etiqueta descriptiva del estado de las instituciones. */
function institutionsLabel(value) {
  if (value <= 35) return "Extractivas";
  if (value >= 65) return "Inclusivas";
  return "Mixtas, en transición";
}

/** Mensaje del gabinete según el estado actual del país. */
function briefingFor(stats, index, country) {
  if (index === 0) return `Acabas de asumir el gobierno de ${country}. Todo está por decidirse.`;
  const ranked = ALL_KEYS.map((key) => [key, stats[key]]);
  const lowest = ranked.reduce((a, b) => (b[1] < a[1] ? b : a));
  if (lowest[1] < 35) return BRIEFING.low[lowest[0]];
  const highest = ranked.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (highest[1] >= 70) return BRIEFING.high[highest[0]];
  return "El país se mantiene en equilibrio, pero cada decisión cuenta.";
}


/* ==========================================================================
   5. INTERFAZ: PANEL DE INDICADORES
   ========================================================================== */

/** Estado de la partida en curso (null hasta pulsar «Comenzar»). */
let game = null;

/** Referencias a los elementos del panel para actualizarlos sin reconstruirlos. */
const ui = { rows: {}, inst: {}, mini: {}, pips: [], cycle: null, title: null };

/** Crea una partida nueva. */
function createGame(country) {
  return {
    country,
    index: 0,             // situación actual
    stats: { ...START_STATS },
    harmful: 0,           // decisiones extractivas acumuladas
    history: [],          // decisiones tomadas: { scenario, option }
    answered: false,
    finished: false
  };
}

/** Construye una vez la estructura del panel de indicadores. */
function buildPanel() {
  const panel = $("#panel");

  ui.title = h("h2", { class: "panel-title" }, "Estado del país");

  // --- Medidor de instituciones (el elemento central del juego) ---
  ui.inst.state = h("span", { class: "inst-state" });
  ui.inst.value = h("span", { class: "inst-value" });
  ui.inst.delta = h("span", { class: "ind-delta" });
  ui.inst.marker = h("span", { class: "inst-marker" });
  ui.inst.rail = h("div", {
    class: "inst-rail", role: "progressbar", "aria-label": INSTITUTIONS.name,
    "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0"
  },
    h("div", { class: "inst-track", "aria-hidden": "true" },
      h("span", { class: "seg seg-bad" }),
      h("span", { class: "seg seg-mid" }),
      h("span", { class: "seg seg-good" })),
    h("span", {
      class: "goal-tick", style: `left:${RULES.win.inst}%`,
      title: `Meta: ${RULES.win.inst}`, "aria-hidden": "true"
    }),
    ui.inst.marker);

  const instCard = h("div", { class: "inst-card", title: INSTITUTIONS.hint },
    h("div", { class: "inst-head" },
      h("span", { class: "inst-name" }, `${INSTITUTIONS.icon} Instituciones`),
      ui.inst.delta,
      ui.inst.value),
    ui.inst.state,
    ui.inst.rail,
    h("div", { class: "inst-scale", "aria-hidden": "true" },
      h("span", {}, "Extractivas"), h("span", {}, "Inclusivas")));

  // --- Barras de los seis indicadores ---
  const list = h("div", { class: "inds" });
  for (const item of INDICATORS) {
    const fill = h("div", { class: "bar-fill" });
    const value = h("span", { class: "ind-value" });
    const delta = h("span", { class: "ind-delta" });
    const bar = h("div", {
      class: "bar", role: "progressbar", "aria-label": item.name,
      "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0"
    }, fill);
    // Marca dorada de meta en los indicadores que cuentan para ganar
    if (RULES.win[item.key]) {
      bar.append(h("span", {
        class: "goal-tick", style: `left:${RULES.win[item.key]}%`,
        title: `Meta: ${RULES.win[item.key]}`, "aria-hidden": "true"
      }));
    }
    const row = h("div", { class: "ind", title: item.hint },
      h("div", { class: "ind-head" },
        h("span", { class: "ind-name" }, `${item.icon} ${item.name}`), delta, value),
      bar);
    ui.rows[item.key] = { row, fill, value, delta, bar };
    list.append(row);
  }

  // --- Margen de error: decisiones extractivas permitidas ---
  ui.pips = Array.from({ length: RULES.maxHarmful }, () => h("span", { class: "pip" }));
  const strikes = h("div", {
    class: "strikes",
    title: `Con ${RULES.maxHarmful} decisiones extractivas el país fracasa`
  },
    h("span", { class: "strikes-label" }, "⚠️ Decisiones extractivas"),
    h("span", { class: "pips" }, ui.pips));

  // --- Aviso del círculo virtuoso o vicioso ---
  ui.cycle = h("p", { class: "cycle-badge", hidden: true });

  panel.replaceChildren(ui.title, instCard, list, strikes, ui.cycle);

  // --- Resumen compacto para móvil (queda fijo en la cabecera) ---
  const mini = $("#mini-hud");
  for (const item of [INSTITUTIONS, ...INDICATORS]) {
    const value = h("b", {});
    const chip = h("span", { class: "mini", title: item.name },
      h("span", { "aria-hidden": "true" }, item.icon),
      h("span", { class: "sr-only" }, item.name),
      value);
    ui.mini[item.key] = { chip, value };
    mini.append(chip);
  }
}

/** Refresca barras, medidor, margen de error y aviso de círculo. */
function renderStats(deltas = {}) {
  const stats = game.stats;
  ui.title.textContent = `Estado de ${game.country}`;

  for (const item of INDICATORS) {
    const ref = ui.rows[item.key];
    const value = stats[item.key];
    const delta = deltas[item.key] || 0;
    ref.fill.style.width = `${value}%`;
    ref.value.textContent = value;
    ref.row.dataset.level = levelFor(value);
    ref.bar.setAttribute("aria-valuenow", String(value));
    ref.delta.textContent = delta ? signed(delta) : "";
    ref.delta.className = `ind-delta${delta > 0 ? " pos" : delta < 0 ? " neg" : ""}`;
  }

  const inst = stats.inst;
  const instDelta = deltas.inst || 0;
  ui.inst.marker.style.left = `${inst}%`;
  ui.inst.value.textContent = inst;
  ui.inst.state.textContent = institutionsLabel(inst);
  ui.inst.rail.setAttribute("aria-valuenow", String(inst));
  ui.inst.delta.textContent = instDelta ? signed(instDelta) : "";
  ui.inst.delta.className = `ind-delta${instDelta > 0 ? " pos" : instDelta < 0 ? " neg" : ""}`;

  for (const key of ALL_KEYS) {
    ui.mini[key].value.textContent = stats[key];
    ui.mini[key].chip.dataset.level = levelFor(stats[key]);
  }

  ui.pips.forEach((pip, i) => pip.classList.toggle("on", i < game.harmful));

  const cycle = cycleFor(stats);
  ui.cycle.hidden = !cycle;
  if (cycle) {
    ui.cycle.textContent = `${CYCLES[cycle].icon} ${CYCLES[cycle].title} activo`;
    ui.cycle.dataset.tone = cycle === "virtuous" ? "good" : "bad";
  }
}

/** Actualiza la barra de progreso de la cabecera. */
function renderProgress() {
  const total = SCENARIOS.length;
  const done = game.history.length;
  const pct = Math.round((done / total) * 100);
  const current = Math.min(game.index + 1, total);
  $("#progress-label").textContent = `Situación ${current} de ${total}`;
  $("#progress-fill").style.width = `${pct}%`;
  $("#progress-pct").textContent = `${pct} %`;
  $("#progress").setAttribute("aria-valuenow", String(pct));
}


/* ==========================================================================
   6. INTERFAZ: SITUACIONES Y RESULTADOS
   ========================================================================== */

/** Orden aleatorio de las opciones de la situación actual. */
let optionOrder = [];

/** Dibuja la tarjeta de la situación actual con sus opciones. */
function renderScenario() {
  const scenario = SCENARIOS[game.index];
  game.answered = false;
  optionOrder = shuffle(scenario.opciones);

  const buttons = optionOrder.map((option) =>
    h("button", {
      type: "button", class: "option", "data-id": option.id,
      onclick: () => choose(option.id)
    }, h("span", { class: "option-text" }, option.texto)));

  $("#scenario").replaceChildren(
    h("span", { class: "tag" }, `${scenario.icon} ${scenario.tema}`),
    h("h2", { class: "scenario-title", id: "scenario-title", tabindex: "-1" }, scenario.titulo),
    h("p", { class: "briefing" }, h("span", { "aria-hidden": "true" }, "🧭"),
      h("span", {}, briefingFor(game.stats, game.index, game.country))),
    h("p", { class: "scenario-text" }, scenario.texto),
    h("p", { class: "prompt" }, "¿Qué decides?"),
    h("div", { class: "options", role: "group", "aria-labelledby": "scenario-title" }, buttons),
    h("div", { id: "result-slot", "aria-live": "polite" }));
}

/** El jugador elige una opción: se calculan efectos y se muestra el resultado. */
function choose(optionId) {
  if (!game || game.answered || game.finished) return;
  game.answered = true;

  const scenario = SCENARIOS[game.index];
  const option = scenario.opciones.find((item) => item.id === optionId);
  const before = game.stats;
  const outcome = resolveDecision(before, game.harmful, option);

  game.stats = outcome.stats;
  game.harmful = outcome.harmful;
  game.history.push({ scenario, option });

  const deltas = diffStats(before, game.stats);
  const isLast = game.index === SCENARIOS.length - 1;

  // Marca la opción elegida y atenúa las demás
  const tone = DECISION_TYPES[option.tipo].tone;
  document.querySelectorAll("#scenario .option").forEach((button) => {
    const chosen = button.dataset.id === option.id;
    button.disabled = true;
    button.classList.add(chosen ? "is-chosen" : "is-dim");
    if (chosen) button.classList.add(`tone-${tone}`);
  });

  renderStats(deltas);
  renderProgress();
  renderResult(option, deltas, outcome, isLast);
}

/** Muestra consecuencias, conexión con el libro y cambios en los indicadores. */
function renderResult(option, deltas, outcome, isLast) {
  const type = DECISION_TYPES[option.tipo];

  // Fichas con el cambio de cada indicador
  const chips = ALL_KEYS.filter((key) => deltas[key] !== 0).map((key) =>
    h("li", { class: `chip ${deltas[key] > 0 ? "pos" : "neg"}` },
      `${LABELS[key].icon} ${LABELS[key].name} ${signed(deltas[key])}`));

  // Texto del botón según lo que ocurra después
  let nextLabel = "Siguiente situación";
  let nextAction = goNext;
  if (outcome.collapse) {
    nextLabel = "Ver qué ocurrió";
    nextAction = () => showLose(outcome.collapse);
  } else if (isLast) {
    nextLabel = "Ver el resultado final";
    nextAction = finishGame;
  }

  const result = h("section", { class: `result tone-${type.tone}`, "aria-label": "Resultado de tu decisión" },
    h("h3", { class: "result-title", tabindex: "-1" }, `${type.icon} ${type.label}`),
    h("p", { class: "result-text" }, option.consecuencia),
    h("div", { class: "book" },
      h("p", { class: "book-title" }, `📖 ${option.libro.concepto}`),
      h("p", { class: "book-text" }, option.libro.texto)),
    chips.length ? h("ul", { class: "chips", "aria-label": "Cambios en los indicadores" }, chips) : null,
    outcome.cycle
      ? h("p", { class: `cycle-note tone-${outcome.cycle === "virtuous" ? "good" : "bad"}` },
          `${CYCLES[outcome.cycle].icon} ${CYCLES[outcome.cycle].title}: ${CYCLES[outcome.cycle].text}`)
      : null,
    h("button", { type: "button", class: "btn btn-primary btn-next", onclick: nextAction }, nextLabel));

  const slot = $("#result-slot");
  slot.replaceChildren(result);
  result.querySelector(".result-title").focus({ preventScroll: true });
  scrollToNode(result, "start");
}

/** Pasa a la siguiente situación. */
function goNext() {
  game.index += 1;
  renderStats();
  renderProgress();
  renderScenario();
  const title = $("#scenario-title");
  title.focus({ preventScroll: true });
  scrollToNode($(".game-grid"), "start");
}


/* ==========================================================================
   7. INTERFAZ: PANTALLAS FINALES
   ========================================================================== */

const SCREENS = ["intro", "game", "win", "mixed", "lose"];

/** Muestra una pantalla y oculta las demás. */
function showScreen(name) {
  for (const screen of SCREENS) $(`#screen-${screen}`).hidden = screen !== name;
  $("#hud").hidden = name !== "game";
  $("#btn-reset").hidden = name === "intro";
  $("#country-label").textContent = game && name !== "intro" ? game.country : "Simulador de instituciones";
  window.scrollTo({ top: 0, behavior: "auto" });
  const heading = $(`#screen-${name} h1, #screen-${name} h2`);
  if (heading && name !== "intro") {
    heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
}

/** Fichas con el valor final de cada indicador. */
function buildTiles(stats) {
  const order = ["inst", "eco", "bien", "edu", "ig", "est", "conf"];
  return h("ul", { class: "tiles" }, order.map((key) =>
    h("li", { class: `tile${key === "inst" ? " tile-wide" : ""}`, "data-level": levelFor(stats[key]) },
      h("span", { class: "tile-value" }, stats[key]),
      h("span", { class: "tile-name" }, `${LABELS[key].icon} ${LABELS[key].name}`))));
}

/** Lista con todas las decisiones tomadas durante la partida. */
function buildRecap() {
  return h("ul", { class: "recap" }, game.history.map(({ scenario, option }) => {
    const type = DECISION_TYPES[option.tipo];
    return h("li", { class: `recap-item tone-${type.tone}` },
      h("span", { class: "recap-icon", title: type.label }, type.icon),
      h("span", { class: "recap-body" },
        h("span", { class: "recap-theme" }, scenario.tema),
        h("span", { class: "recap-choice" }, option.resumen),
        h("span", { class: "recap-type" }, type.label)));
  }));
}

/** Botones comunes de las pantallas finales. */
function buildEndActions(primaryLabel) {
  return h("div", { class: "end-actions" },
    h("button", { type: "button", class: "btn btn-primary", onclick: () => startGame(game.country) }, primaryLabel),
    h("button", { type: "button", class: "btn btn-ghost", onclick: backToIntro }, "Volver a la introducción"));
}

/** Cierra la partida y decide qué pantalla final corresponde. */
function finishGame() {
  game.finished = true;
  const ending = evaluateEnding(game.stats);
  if (ending.type === "win") showWin();
  else showPartial(ending);
}

/** Pantalla de victoria. */
function showWin() {
  const screen = $("#screen-win");

  // Partículas doradas: un único momento de celebración
  const particles = h("div", { class: "particles", "aria-hidden": "true" });
  for (let i = 0; i < 18; i += 1) {
    const dot = h("span", { class: "particle" }, "✦");
    dot.style.setProperty("--x", `${Math.round(Math.random() * 100)}%`);
    dot.style.setProperty("--delay", `${(Math.random() * 4).toFixed(2)}s`);
    dot.style.setProperty("--dur", `${(5 + Math.random() * 5).toFixed(2)}s`);
    dot.style.setProperty("--size", `${(0.7 + Math.random() * 0.9).toFixed(2)}rem`);
    particles.append(dot);
  }

  screen.replaceChildren(
    particles,
    h("div", { class: "end-hero" },
      h("span", { class: "end-emblem", "aria-hidden": "true" }, "🏆"),
      h("h1", { class: "end-title" }, WIN_TITLE),
      h("p", { class: "lead" }, `${game.country} alcanzó el equilibrio entre desarrollo económico, bienestar social e instituciones inclusivas.`)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Así quedó tu país"),
      buildTiles(game.stats)),
    h("div", { class: "card reflection" },
      h("h2", { class: "card-title" }, "📖 Reflexión sobre el libro"),
      h("blockquote", { class: "quote" }, h("p", {}, WIN_REFLECTION))),
    h("div", { class: "card message" },
      h("h2", { class: "card-title" }, "Un último pensamiento"),
      h("p", {}, WIN_FINAL_MESSAGE)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Tu recorrido"),
      buildRecap()),
    buildEndActions("Jugar de nuevo"));

  showScreen("win");
}

/** Pantalla intermedia: no fracasó, pero tampoco alcanzó el equilibrio. */
function showPartial(ending) {
  const screen = $("#screen-mixed");
  const growth = ending.type === "growth";

  const title = growth ? "Crecimiento sin futuro" : "Un país a medio camino";
  const emblem = growth ? "🏭" : "🧭";
  const summary = growth
    ? `La economía de ${game.country} brilla, pero el poder sigue concentrado. Según Acemoglu y Robinson, el crecimiento bajo instituciones extractivas es posible (como en la Unión Soviética a mediados del siglo XX), pero no se sostiene: sin innovación ni destrucción creativa, tarde o temprano se agota.`
    : `${game.country} evitó el desastre, pero no alcanzó el equilibrio entre desarrollo, bienestar e instituciones inclusivas. Construirlas lleva tiempo y exige decisiones consistentes: las medias tintas mantienen abierta la puerta al círculo vicioso.`;

  const missing = ending.unmet.map(({ key, value, need }) =>
    h("li", {}, `${LABELS[key].icon} ${LABELS[key].name}: tienes ${value} y la meta es ${need}.`));

  screen.replaceChildren(
    h("div", { class: "end-hero" },
      h("span", { class: "end-emblem", "aria-hidden": "true" }, emblem),
      h("h1", { class: "end-title" }, title),
      h("p", { class: "lead" }, summary)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Así quedó tu país"),
      buildTiles(game.stats)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Lo que faltó para ganar"),
      h("ul", { class: "plain-list" }, missing)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Tu recorrido"),
      buildRecap()),
    buildEndActions("Intentarlo de nuevo"));

  showScreen("mixed");
}

/** Pantalla de derrota: explica qué provocó el fracaso. */
function showLose(collapse) {
  game.finished = true;
  const screen = $("#screen-lose");

  // Indicadores en zona crítica
  const critical = ALL_KEYS.filter((key) => game.stats[key] < 30);

  // Decisiones que más pesaron: las no inclusivas que más dañaron las instituciones
  const heavy = game.history
    .filter(({ option }) => option.tipo !== "inclusive")
    .sort((a, b) => (a.option.efectos.inst || 0) - (b.option.efectos.inst || 0))
    .slice(0, 5);

  const criticalList = critical.length
    ? h("ul", { class: "plain-list" }, critical.map((key) =>
        h("li", {}, `${LABELS[key].icon} ${LABELS[key].name}: ${game.stats[key]} de 100. ${LABELS[key].hint}.`)))
    : h("p", {}, "Ningún indicador cayó a zona crítica por sí solo; fue la suma de decisiones extractivas lo que hundió al país.");

  const heavyList = h("ul", { class: "recap" }, heavy.map(({ scenario, option }) => {
    const type = DECISION_TYPES[option.tipo];
    return h("li", { class: `recap-item tone-${type.tone}` },
      h("span", { class: "recap-icon", title: type.label }, type.icon),
      h("span", { class: "recap-body" },
        h("span", { class: "recap-theme" }, scenario.tema),
        h("span", { class: "recap-choice" }, option.resumen),
        h("span", { class: "recap-type" }, `Concepto del libro: ${option.libro.concepto}`)));
  }));

  screen.replaceChildren(
    h("div", { class: "end-hero" },
      h("span", { class: "end-emblem", "aria-hidden": "true" }, "📉"),
      h("h1", { class: "end-title" }, `${game.country} ha fracasado`),
      h("p", { class: "lead" }, h("strong", {}, `${collapse.title}. `), collapse.text)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Así terminó tu país"),
      buildTiles(game.stats)),
    h("div", { class: "card" },
      h("h2", { class: "card-title" }, "Indicadores en crisis"),
      criticalList),
    heavy.length
      ? h("div", { class: "card" },
          h("h2", { class: "card-title" }, "Decisiones que pesaron"),
          heavyList)
      : null,
    h("div", { class: "card message" },
      h("h2", { class: "card-title" }, "Lo que enseña el libro"),
      h("p", {}, "Acemoglu y Robinson explican que los países fracasan cuando sus instituciones son extractivas: concentran el poder y la riqueza en pocas manos y bloquean las oportunidades del resto. Esas instituciones se refuerzan a sí mismas en un círculo vicioso."),
      h("p", {}, "Pista para la próxima partida: las decisiones que reparten el poder y abren oportunidades suelen costar algo a corto plazo, pero son las que fortalecen a un país a largo plazo.")),
    buildEndActions("Intentarlo de nuevo"));

  showScreen("lose");
}


/* ==========================================================================
   8. ARRANQUE
   ========================================================================== */

/** Inicia una partida nueva con el país indicado. */
function startGame(country) {
  game = createGame(country);
  renderStats();
  renderProgress();
  renderScenario();
  showScreen("game");
}

/** Vuelve a la pantalla de introducción. */
function backToIntro() {
  game = null;
  showScreen("intro");
}

/** Configura eventos y prepara la interfaz. */
function init() {
  $("#total-scenarios").textContent = String(SCENARIOS.length);
  buildPanel();

  // Formulario de inicio: lee el nombre del país y comienza la partida
  $("#start-form").addEventListener("submit", (event) => {
    event.preventDefault();
    startGame(cleanCountryName($("#country-name").value));
  });

  // Botón de reinicio: pide una segunda pulsación para evitar pérdidas accidentales
  const resetButton = $("#btn-reset");
  let armed = false;
  let timer = 0;
  const disarm = () => {
    armed = false;
    resetButton.textContent = "↺ Reiniciar";
    resetButton.classList.remove("is-armed");
  };
  resetButton.addEventListener("click", () => {
    const inProgress = game && !game.finished;
    if (inProgress && !armed) {
      armed = true;
      resetButton.textContent = "¿Seguro? Pulsa otra vez";
      resetButton.classList.add("is-armed");
      timer = window.setTimeout(disarm, 3000);
      return;
    }
    window.clearTimeout(timer);
    disarm();
    backToIntro();
  });
}

init();

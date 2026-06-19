import { addComponent, addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  prefix?: string
  loadFont?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-jalali-minical',
    configKey: 'jalaliMinical',
    compatibility: { nuxt: '^3.10.0' },
  },
  defaults: { prefix: '', loadFont: true },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    if (options.loadFont) nuxt.options.css.push('@fontsource-variable/noto-sans-arabic/index.css')
    const components = ['JalaliCalendar', 'JalaliDatePicker', 'JalaliRangeDatePicker']
    for (const name of components) {
      addComponent({ name: `${options.prefix ?? ''}${name}`, filePath: resolver.resolve(`./components/${name}.vue`) })
    }
    const utilityNames = [
      'toJalali', 'toGregorian', 'formatJalaliDate', 'parseJalaliInput',
      'isValidJalaliDate', 'isJalaliLeapYear', 'getJalaliMonthLength',
      'compareDates', 'isDateInRange', 'addJalaliMonths', 'addJalaliDays',
    ]
    addImports(utilityNames.map(name => ({ name, from: resolver.resolve(name === 'formatJalaliDate' ? './utils/format' : './utils/jalali') })))
    addPlugin(resolver.resolve('./plugin'))
  },
})
